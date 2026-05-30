import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Edit2, PlayCircle, BookOpen, Layers, Search, Volume2, Plus, Trash2, Users, Check, X } from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { playAudio, speakJapanese } from '../../utils/audio';

const InlineEditCell = ({ value, onSave, className = '', isJapanese = false }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const startEdit = () => { setDraft(value); setEditing(true); };
    const cancel = () => { setDraft(value); setEditing(false); };
    const save = () => { if (draft.trim() !== value.trim()) onSave(draft.trim()); setEditing(false); };
    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') cancel(); };

    if (editing) {
        return (
            <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={handleKeyDown}
                className={`w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg px-3 py-1.5 outline-none text-gray-900 dark:text-white ${isJapanese ? 'font-japanese' : ''} ${className}`}
            />
        );
    }

    return (
        <div
            onClick={startEdit}
            className={`cursor-pointer rounded-lg px-3 py-1.5 -mx-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 ${className}`}
            title="Bấm để sửa"
        >
            {isJapanese ? <FuriganaText text={value} forceHide={true} /> : value}
        </div>
    );
};

const StudySetDetail = ({ 
    folderId, folders, cardFolders, allCards, 
    onBack, onEditSet, onStudySet, onFlashcardSet, onReviewSet, onSynonymQuiz,
    onNavigateToAdd, onDeleteFolder, onSaveChanges, onSaveCardAudio,
    onDeleteCards
}) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const folder = useMemo(() => {
        if (folderId === 'unfiled') return { id: 'unfiled', name: 'Từ vựng lẻ', description: 'Các từ vựng chưa được phân loại vào học phần nào.' };
        return folders.find(f => f.id === folderId) || { name: 'Học phần không xác định' };
    }, [folderId, folders]);

    const setCards = useMemo(() => {
        if (folderId === 'unfiled') return allCards.filter(c => !cardFolders[c.id] || cardFolders[c.id] === 'unfiled');
        return allCards.filter(c => cardFolders[c.id] === folderId);
    }, [folderId, allCards, cardFolders]);

    const activeCard = setCards[currentCardIndex];
    
    const changeCard = (newIndex) => {
        if (isCardFlipped) {
            setIsAnimatingFlip(false);
            setIsCardFlipped(false);
            setCurrentCardIndex(newIndex);
            setTimeout(() => setIsAnimatingFlip(true), 50);
        } else {
            setCurrentCardIndex(newIndex);
        }
    };

    const nextCard = (e) => { e?.stopPropagation(); if (currentCardIndex < setCards.length - 1) changeCard(currentCardIndex + 1); };
    const prevCard = (e) => { e?.stopPropagation(); if (currentCardIndex > 0) changeCard(currentCardIndex - 1); };

    const handleInlineSave = (card, field, newValue) => {
        if (!onSaveChanges) return;
        onSaveChanges({
            cardId: card.id,
            front: field === 'front' ? newValue : card.front,
            back: field === 'back' ? newValue : card.back,
            synonym: card.synonym || '', example: card.example || '',
            exampleMeaning: card.exampleMeaning || '', nuance: card.nuance || '',
            pos: card.pos || '', level: card.level || '',
            imageBase64: card.imageBase64,
            sinoVietnamese: card.sinoVietnamese || '',
            synonymSinoVietnamese: card.synonymSinoVietnamese || ''
        });
    };

    const handleDeleteFolder = () => { if (onDeleteFolder) onDeleteFolder(folderId); setShowDeleteConfirm(false); if (onBack) onBack(); };

    // Delete all unfiled cards permanently
    const handleDeleteUnfiledCards = () => {
        if (onDeleteCards) {
            onDeleteCards(setCards.map(c => c.id));
        }
        setShowDeleteConfirm(false);
    };

    return (
        <div className="w-full pb-20 min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 font-medium transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Trở về Thư viện
                    </button>
                    <div className="flex items-center gap-4">
                        <button onClick={() => onEditSet && onEditSet(folderId)} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors text-sm font-medium">
                            <Edit2 className="w-4 h-4" /> Chỉnh sửa
                        </button>
                        {/* Folder delete — or unfiled bulk delete */}
                        {folderId === 'unfiled' ? (
                            onDeleteCards && setCards.length > 0 && (
                                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm">
                                    <Trash2 className="w-4 h-4" /> Xoá tất cả từ lẻ
                                </button>
                            )
                        ) : (
                            onDeleteFolder && (
                                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm">
                                    <Trash2 className="w-4 h-4" /> Xoá học phần
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8 space-y-10">
                {/* Title */}
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
                    <div className="space-y-3 flex-1">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-850 dark:text-white">{folder.name}</h1>
                        {folder.description && <p className="text-slate-650 dark:text-slate-400 text-base md:text-lg leading-relaxed">{folder.description}</p>}
                        <div className="flex items-center gap-2 pt-2">
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                                {setCards.length} thuật ngữ
                            </span>
                        </div>
                    </div>
                    {folder.coverImage && (
                        <div className="w-full md:w-64 h-36 md:h-28 rounded-2xl overflow-hidden shrink-0 shadow border border-slate-100 dark:border-slate-700/60">
                            <img src={folder.coverImage} alt={folder.name} className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                {setCards.length > 0 ? (
                    <>
                        {/* Quizlet-style Flashcard */}
                        <div className="w-full max-w-3xl mx-auto">
                            <div className="perspective-1000 w-full" style={{ minHeight: '280px' }}>
                                <div
                                    onClick={() => { setIsAnimatingFlip(true); setIsCardFlipped(!isCardFlipped); if (!isCardFlipped && activeCard) speakJapanese(activeCard.front, activeCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(activeCard.id, b64, vid) : null); }}
                                    className={`relative w-full cursor-pointer transform-style-preserve-3d ${isAnimatingFlip ? 'transition-transform duration-500' : ''} ${isCardFlipped ? 'rotate-y-180' : ''}`}
                                    style={{ minHeight: '280px' }}
                                >
                                    {/* Front */}
                                    <div className="absolute inset-0 backface-hidden bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-600 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center">
                                        <div className="text-3xl md:text-4xl font-bold text-white font-japanese">
                                            <FuriganaText text={activeCard?.frontWithFurigana || activeCard?.front || ''} />
                                        </div>
                                        <p className="text-slate-400 text-xs mt-6">Nhấn để lật</p>
                                        {activeCard?.audioBase64 && (
                                            <button onClick={(e) => { e.stopPropagation(); playAudio(activeCard.audioBase64); }} className="absolute top-4 right-4 p-3 bg-slate-600 hover:bg-indigo-500 text-white rounded-full transition-all hover:scale-110">
                                                <Volume2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    {/* Back */}
                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-600 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center">
                                        <div className="text-2xl md:text-3xl font-bold text-white">{activeCard?.back}</div>
                                        {activeCard?.sinoVietnamese && <p className="text-yellow-300 mt-3 text-base"><span className="text-slate-400">Hán Việt: </span>{activeCard.sinoVietnamese}</p>}
                                        {activeCard?.example && <p className="mt-4 text-sm text-slate-300 italic">"{activeCard.example}"</p>}
                                    </div>
                                </div>
                            </div>
                            {/* Navigation */}
                            <div className="flex items-center justify-center gap-6 mt-5">
                                <button onClick={prevCard} disabled={currentCardIndex === 0} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow border border-gray-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </button>
                                <span className="text-sm font-bold text-gray-400 tracking-widest">{currentCardIndex + 1} / {setCards.length}</span>
                                <button onClick={nextCard} disabled={currentCardIndex === setCards.length - 1} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow border border-gray-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button onClick={() => onFlashcardSet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-600 shadow-sm hover:shadow-lg transition-all group">
                                <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Layers className="w-5 h-5 text-blue-500" /></div>
                                <span className="font-bold text-sm text-gray-800 dark:text-white">Thẻ ghi nhớ</span>
                                <span className="text-[11px] text-gray-500 mt-0.5">Lướt thẻ nhanh</span>
                            </button>
                            <button onClick={() => onStudySet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm hover:shadow-lg transition-all group">
                                <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5 text-emerald-500" /></div>
                                <span className="font-bold text-sm text-gray-800 dark:text-white">Học (Learn)</span>
                                <span className="text-[11px] text-gray-500 mt-0.5">Trắc nghiệm + Tự luận</span>
                            </button>
                            <button onClick={() => onReviewSet(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-amber-400 dark:hover:border-amber-600 shadow-sm hover:shadow-lg transition-all group">
                                <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><PlayCircle className="w-5 h-5 text-amber-500" /></div>
                                <span className="font-bold text-sm text-gray-800 dark:text-white">Ôn trắc nghiệm</span>
                                <span className="text-[11px] text-gray-500 mt-0.5">Kiểm tra kiến thức</span>
                            </button>
                            <button onClick={() => onSynonymQuiz && onSynonymQuiz(folderId)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow-lg transition-all group">
                                <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Users className="w-5 h-5 text-purple-500" /></div>
                                <span className="font-bold text-sm text-gray-800 dark:text-white">Đồng nghĩa</span>
                                <span className="text-[11px] text-gray-500 mt-0.5">Trắc nghiệm synonym</span>
                            </button>
                        </div>

                        {/* Term List - Inline Editable */}
                        <div className="pt-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thuật ngữ ({setCards.length})</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">Bấm vào từ để sửa trực tiếp</p>
                            </div>
                            <div className="space-y-3">
                                {setCards.map(card => (
                                    <div key={card.id} className="flex flex-col md:flex-row bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4 md:gap-6 items-stretch">
                                        <div className="flex-1 md:w-1/2 flex flex-col justify-center md:border-r border-gray-100 dark:border-gray-700 md:pr-6">
                                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                                                <InlineEditCell
                                                    value={card.frontWithFurigana || card.front}
                                                    isJapanese={true}
                                                    onSave={(v) => handleInlineSave(card, 'front', v)}
                                                    className="text-lg font-bold"
                                                />
                                            </div>
                                            {card.sinoVietnamese && (
                                                <div className="text-yellow-600 dark:text-yellow-500 text-sm mt-1 font-medium">
                                                    <InlineEditCell
                                                        value={card.sinoVietnamese}
                                                        onSave={(v) => handleInlineSave(card, 'sinoVietnamese', v)}
                                                        className="text-sm font-medium inline-block"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 md:w-1/2 flex items-center justify-between gap-4">
                                            <div className="flex-1 flex flex-col justify-center text-lg text-gray-800 dark:text-gray-200">
                                                <InlineEditCell
                                                    value={card.back}
                                                    onSave={(v) => handleInlineSave(card, 'back', v)}
                                                    className="text-lg"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {card.imageBase64 && (
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <img src={card.imageBase64} alt={card.front} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                {card.audioBase64 && (
                                                    <button onClick={() => playAudio(card.audioBase64)} className="p-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors flex-shrink-0">
                                                        <Volume2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
                        <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Học phần này trống</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Chưa có từ vựng nào trong học phần này.</p>
                        <button onClick={folderId !== 'unfiled' ? () => onEditSet(folderId) : onNavigateToAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-indigo-700 transition-colors">
                            <Plus className="w-5 h-5" /> {folderId !== 'unfiled' ? 'Thêm từ vựng ngay' : 'Tạo học phần mới'}
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-500" /></div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                    {folderId === 'unfiled' ? 'Xoá tất cả từ vựng lẻ' : 'Xoá học phần'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Không thể hoàn tác.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            {folderId === 'unfiled'
                                ? <>Xoá vĩnh viễn <strong className="text-red-500">{setCards.length} từ vựng lẻ</strong>? Thao tác này không thể hoàn tác.</>
                                : <>Xoá <strong>"{folder.name}"</strong>? Từ vựng sẽ thành từ lẻ.</>
                            }
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Huỷ</button>
                            <button
                                onClick={folderId === 'unfiled' ? handleDeleteUnfiledCards : handleDeleteFolder}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                            >Xoá</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

export default StudySetDetail;
