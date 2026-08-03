import React from 'react';
import { BookOpen, Trash2, Search, Sparkle, X as XIcon, Loader2, Volume2, AlertTriangle, Check, RefreshCw, Bot } from 'lucide-react';
import { playAudio } from '../../utils/audio';

const AdminVocabularySection = ({
    handleClearSharedVocabCollection,
    isClearingDict,
    jaCount,
    enCount,
    dictLangTab,
    setDictLangTab,
    dictSearchQuery,
    setDictSearchQuery,
    dictLevelFilter,
    setDictLevelFilter,
    dictPosFilter,
    setDictPosFilter,
    dictErrorReportedFilter,
    setDictErrorReportedFilter,
    dictKanjiFilter,
    setDictKanjiFilter,
    filteredDictResults,
    isBulkRecreating,
    bulkProgress,
    handleCancelBulkRecreate,
    handleBulkAiRecreate,
    isLoadingDict,
    visibleLimit,
    setVisibleLimit,
    recreatingVocabId,
    handleAiRecreateVocabulary,
    handleOpenEditModal,
    setDeletingDictItem,
    editingDictItem,
    setEditingDictItem,
    handleSaveDictItem,
    showAudioRecreatePopup,
    setShowAudioRecreatePopup,
    isManualInputMode,
    setIsManualInputMode,
    customAudioText,
    setCustomAudioText,
    isGeneratingAudio,
    setIsGeneratingAudio,
    generateAudioSilent,
    originalAudioBase64,
    setNotification,
    deletingDictItem,
    handleDeleteDictItem
}) => {
    return (
        <div className="space-y-6">
            {/* Part 2: Vocabulary List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-150 dark:border-gray-750 pb-3 gap-3">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Quản lý kho từ vựng dùng chung (Shared Vocabulary)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Phân chia riêng biệt giữa kho Tiếng Nhật và kho Tiếng Anh
                        </p>
                    </div>

                    {/* Clear Collection Danger Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => handleClearSharedVocabCollection('ja')}
                            disabled={isClearingDict}
                            className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Xóa toàn bộ kho từ vựng Tiếng Nhật"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa Sạch Kho Tiếng Nhật ({jaCount})
                        </button>
                        <button
                            onClick={() => handleClearSharedVocabCollection('en')}
                            disabled={isClearingDict}
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Xóa toàn bộ kho từ vựng Tiếng Anh"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa Sạch Kho Tiếng Anh ({enCount})
                        </button>
                    </div>
                </div>

                {/* Language Selector Tabs */}
                <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl w-fit">
                    <button
                        onClick={() => setDictLangTab('ja')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            dictLangTab === 'ja'
                                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <span className="text-base">🇯🇵</span> Kho Tiếng Nhật ({jaCount} từ)
                    </button>
                    <button
                        onClick={() => setDictLangTab('en')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            dictLangTab === 'en'
                                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <span className="text-base">🇬🇧</span> Kho Tiếng Anh ({enCount} từ)
                    </button>
                </div>

                {/* Filters & Search Row */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px] relative">
                        <input
                            type="text"
                            placeholder="Tìm theo chữ Nhật, nghĩa, Hán Việt..."
                            value={dictSearchQuery}
                            onChange={(e) => setDictSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/25"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">{dictLangTab === 'en' ? 'Trình độ/CEFR:' : 'JLPT:'}</span>
                        <select
                            value={dictLevelFilter}
                            onChange={(e) => setDictLevelFilter(e.target.value)}
                            className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả</option>
                            {dictLangTab === 'en' ? (
                                <>
                                    <option value="A1">A1</option>
                                    <option value="A2">A2</option>
                                    <option value="B1">B1</option>
                                    <option value="B2">B2</option>
                                    <option value="C1">C1</option>
                                    <option value="C2">C2</option>
                                </>
                            ) : (
                                <>
                                    <option value="N1">N1</option>
                                    <option value="N2">N2</option>
                                    <option value="N3">N3</option>
                                    <option value="N4">N4</option>
                                    <option value="N5">N5</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Từ loại:</span>
                        <select
                            value={dictPosFilter}
                            onChange={(e) => setDictPosFilter(e.target.value)}
                            className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả</option>
                            <option value="noun">Danh từ (Noun)</option>
                            <option value="verb">Động từ (Verb)</option>
                            <option value="suru_verb">Động từ Suru</option>
                            <option value="adjective_i">Tính từ đuôi i</option>
                            <option value="adjective_na">Tính từ đuôi na</option>
                            <option value="adverb">Phó từ (Adverb)</option>
                            <option value="pronoun">Đại từ (Pronoun)</option>
                            <option value="grammar">Ngữ pháp (Grammar)</option>
                            <option value="phrase">Cụm từ (Phrase)</option>
                            <option value="other">Khác (Other)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Trạng thái lỗi:</span>
                        <select
                            value={dictErrorReportedFilter}
                            onChange={(e) => setDictErrorReportedFilter(e.target.value)}
                            className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả</option>
                            <option value="error">Có báo cáo lỗi</option>
                            <option value="normal">Bình thường</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Bộ lọc Kanji:</span>
                        <select
                            value={dictKanjiFilter}
                            onChange={(e) => setDictKanjiFilter(e.target.value)}
                            className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả</option>
                            <option value="no_kanji">Không có Kanji</option>
                            <option value="lowercase_sino">Hán Việt viết thường</option>
                            <option value="no_kanji_or_lowercase_sino">Không Kanji hoặc Hán Việt viết thường</option>
                        </select>
                    </div>
                </div>

                {/* Bulk AI Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl">
                    <div className="text-xs text-gray-600 dark:text-gray-350">
                        <span>Bộ lọc hiện tại có <strong>{filteredDictResults.length}</strong> từ vựng.</span>
                        {isBulkRecreating && (
                            <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                                (Đang xử lý: {bulkProgress.current}/{bulkProgress.total})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isBulkRecreating ? (
                            <>
                                <div className="w-32 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-full transition-all duration-300"
                                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                    />
                                </div>
                                <button
                                    onClick={handleCancelBulkRecreate}
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-650 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                    Dừng lại
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleBulkAiRecreate}
                                disabled={filteredDictResults.length === 0}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                                <Sparkle className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                                <span>AI tạo hàng loạt ({filteredDictResults.length})</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Vocabulary List Table */}
                <div className="border border-gray-150 dark:border-gray-750 rounded-xl overflow-hidden">
                    {isLoadingDict ? (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            <span>Đang tải dữ liệu từ vựng kho chung...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-750/30 border-b border-gray-150 dark:border-gray-750 text-gray-500 font-bold">
                                        <th className="p-3">{dictLangTab === 'en' ? 'Từ vựng (Anh)' : 'Từ vựng (Nhật)'}</th>
                                        <th className="p-3">Nghĩa tiếng Việt</th>
                                        <th className="p-3">{dictLangTab === 'en' ? 'Phiên âm IPA' : 'Hán Việt'}</th>
                                        <th className="p-3">Từ loại</th>
                                        <th className="p-3">Trình độ</th>
                                        <th className="p-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 dark:divide-gray-750">
                                    {filteredDictResults.slice(0, visibleLimit).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400 italic">Không tìm thấy từ vựng nào khớp với bộ lọc.</td>
                                        </tr>
                                    ) : (
                                        filteredDictResults.slice(0, visibleLimit).map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                                                <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span>{item.front}</span>
                                                        {item.audioBase64 && (
                                                            <button
                                                                onClick={() => playAudio(item.audioBase64)}
                                                                className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                                                                title="Nghe thử âm thanh"
                                                            >
                                                                <Volume2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {item.reportedError && (
                                                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] font-bold flex items-center gap-0.5 animate-pulse">
                                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                                Có báo lỗi
                                                            </span>
                                                        )}
                                                        {item.reportedAudioError && (
                                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] font-bold flex items-center gap-0.5 animate-pulse">
                                                                <Volume2 className="w-2.5 h-2.5" />
                                                                Lỗi Audio
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-gray-655 dark:text-gray-300 max-w-[200px] truncate">{item.back || item.meaning}</td>
                                                <td className="p-3 text-pink-600 dark:text-pink-400 font-bold">{item.sinoVietnamese || '-'}</td>
                                                <td className="p-3 text-gray-500 font-medium">{item.pos || '-'}</td>
                                                <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded">{item.level || '-'}</span></td>
                                                <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleAiRecreateVocabulary(item)}
                                                        disabled={recreatingVocabId === item.id}
                                                        className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded text-[10px] font-bold disabled:opacity-50 transition-all"
                                                    >
                                                        {recreatingVocabId === item.id ? 'Đang tạo...' : 'AI tạo từ vựng'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEditModal(item)}
                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-[10px] font-bold transition-all"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingDictItem(item.id)}
                                                        className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-[10px] font-bold transition-all"
                                                    >
                                                        Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {filteredDictResults.length > visibleLimit && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-750/10 text-center border-t border-gray-150 dark:border-gray-750">
                            <button
                                onClick={() => setVisibleLimit(prev => prev + 50)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Xem thêm từ vựng (+50)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Dictionary Item Modal */}
            {editingDictItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-xl w-full shadow-2xl animate-bounce-in text-left">
                        <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-750 pb-3 mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-500" />
                                Sửa từ vựng kho chung
                            </h3>
                            <button
                                onClick={() => setEditingDictItem(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDictItem} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mục từ (Nhật)</label>
                                    <input
                                        type="text"
                                        value={editingDictItem.front}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, front: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nghĩa tiếng Việt</label>
                                    <input
                                        type="text"
                                        value={editingDictItem.back || editingDictItem.meaning || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, back: e.target.value, meaning: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hán Việt</label>
                                    <input
                                        type="text"
                                        value={editingDictItem.sinoVietnamese || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, sinoVietnamese: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Từ loại (POS)</label>
                                    <select
                                        value={editingDictItem.pos || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, pos: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    >
                                        <option value="">Không có</option>
                                        <option value="noun">Danh từ (Noun)</option>
                                        <option value="verb">Động từ (Verb)</option>
                                        <option value="suru_verb">Động từ Suru</option>
                                        <option value="adjective_i">Tính từ đuôi i</option>
                                        <option value="adjective_na">Tính từ đuôi na</option>
                                        <option value="adverb">Phó từ (Adverb)</option>
                                        <option value="pronoun">Đại từ (Pronoun)</option>
                                        <option value="grammar">Ngữ pháp (Grammar)</option>
                                        <option value="phrase">Cụm từ (Phrase)</option>
                                        <option value="other">Khác (Other)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">JLPT Level</label>
                                    <select
                                        value={editingDictItem.level || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, level: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    >
                                        <option value="">Không rõ</option>
                                        <option value="N1">N1</option>
                                        <option value="N2">N2</option>
                                        <option value="N3">N3</option>
                                        <option value="N4">N4</option>
                                        <option value="N5">N5</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Từ đồng nghĩa</label>
                                    <input
                                        type="text"
                                        value={editingDictItem.synonym || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, synonym: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hán Việt đồng nghĩa</label>
                                    <input
                                        type="text"
                                        value={editingDictItem.synonymSinoVietnamese || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, synonymSinoVietnamese: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sắc thái/Nuance</label>
                                    <input
                                        type="text"
                                        value={editingDictItem.nuance || ''}
                                        onChange={(e) => setEditingDictItem(prev => ({ ...prev, nuance: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ví dụ</label>
                                <input
                                    type="text"
                                    value={editingDictItem.example || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, example: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giải nghĩa ví dụ</label>
                                <input
                                    type="text"
                                    value={editingDictItem.exampleMeaning || ''}
                                    onChange={(e) => setEditingDictItem(prev => ({ ...prev, exampleMeaning: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>

                            {/* Audio Section for Admin */}
                            <div className="pt-3 border-t border-gray-150 dark:border-gray-750 mb-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Audio kho chung</label>
                                <div className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-150 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAudioRecreatePopup(true);
                                                setIsManualInputMode(false);
                                                setCustomAudioText(editingDictItem.front.split('（')[0].split('(')[0].trim());
                                            }}
                                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-350 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm dark:text-gray-200 cursor-pointer"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                                            Tạo lại âm thanh
                                        </button>
                                    </div>

                                    {/* Playback Controls */}
                                    <div className="flex flex-wrap items-center gap-4 text-xs">
                                        {/* Original Audio (Before Edit) */}
                                        {originalAudioBase64 && (
                                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700">
                                                <span className="text-gray-500 font-medium">Audio gốc (Trước sửa):</span>
                                                <button
                                                    type="button"
                                                    onClick={() => playAudio(originalAudioBase64)}
                                                    className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                                                    title="Nghe audio gốc"
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Current / New Audio (After Edit / Recreated) */}
                                        {editingDictItem.audioBase64 ? (
                                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700">
                                                <span className="text-gray-500 font-medium">
                                                    {editingDictItem.audioBase64 === originalAudioBase64 ? "Audio hiện tại:" : "Audio mới (Sau sửa):"}
                                                </span>
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                                    <Check className="w-3.5 h-3.5" /> Có sẵn
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => playAudio(editingDictItem.audioBase64)}
                                                    className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                                                    title="Nghe audio mới"
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingDictItem(prev => ({ ...prev, audioBase64: null }))}
                                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                                    title="Xóa audio"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-150 dark:border-gray-750">
                                                <span className="text-gray-400 italic">Chưa có audio mới</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-750">
                                <button
                                    type="button"
                                    onClick={() => setEditingDictItem(null)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all"
                                >
                                    Lưu lại
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sub-modal: Recreate Audio Choices */}
            {showAudioRecreatePopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full shadow-2xl text-center animate-bounce-in">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-base">Tạo lại âm thanh</h4>
                        
                        {!isManualInputMode ? (
                            <>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                                    Chọn phương thức tạo lại âm thanh cho từ vựng: <br />
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">"{editingDictItem.front}"</span>
                                </p>
                                
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsGeneratingAudio(true);
                                            try {
                                                const cleanText = editingDictItem.front.split('（')[0].split('(')[0].trim();
                                                const result = await generateAudioSilent(cleanText);
                                                if (result && result.base64) {
                                                    setEditingDictItem(prev => ({ ...prev, audioBase64: result.base64 }));
                                                    setNotification({ type: 'success', message: 'Đã tạo âm thanh bằng AI thành công!' });
                                                    setShowAudioRecreatePopup(false);
                                                } else {
                                                    setNotification({ type: 'error', message: 'Không thể tạo âm thanh bằng AI. Vui lòng kiểm tra cấu hình Azure Speech.' });
                                                }
                                            } catch (err) {
                                                console.error("AI audio generation error:", err);
                                                setNotification({ type: 'error', message: 'Lỗi khi tạo âm thanh AI: ' + err.message });
                                            } finally {
                                                setIsGeneratingAudio(false);
                                            }
                                        }}
                                        disabled={isGeneratingAudio}
                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isGeneratingAudio ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Sparkle className="w-4 h-4 text-amber-300 fill-amber-300" />
                                        )}
                                        Dùng AI (Tự động theo chữ Nhật)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsManualInputMode(true)}
                                        className="w-full py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-205 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                    >
                                        <Bot className="w-4 h-4 text-indigo-500" />
                                        Nhập tay chữ đọc (Hiragana...)
                                    </button>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => setShowAudioRecreatePopup(false)}
                                    className="mt-6 text-xs text-gray-500 hover:text-gray-750 dark:hover:text-gray-300 font-medium cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    Nhập Hiragana hoặc chữ đọc tùy chỉnh cho: <br />
                                    <span className="font-semibold text-indigo-650 dark:text-indigo-400">"{editingDictItem.front}"</span>
                                </p>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={customAudioText}
                                        onChange={(e) => setCustomAudioText(e.target.value)}
                                        placeholder="Ví dụ: たべる..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none text-center dark:text-white"
                                        disabled={isGeneratingAudio}
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsManualInputMode(false)}
                                            disabled={isGeneratingAudio}
                                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            Quay lại
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!customAudioText.trim()) {
                                                    setNotification({ type: 'error', message: 'Vui lòng nhập chữ đọc.' });
                                                    return;
                                                }
                                                setIsGeneratingAudio(true);
                                                try {
                                                    const result = await generateAudioSilent(customAudioText.trim());
                                                    if (result && result.base64) {
                                                        setEditingDictItem(prev => ({ ...prev, audioBase64: result.base64 }));
                                                        setNotification({ type: 'success', message: 'Đã tạo âm thanh từ chữ đọc thành công!' });
                                                        setShowAudioRecreatePopup(false);
                                                    } else {
                                                        setNotification({ type: 'error', message: 'Không thể tạo âm thanh. Vui lòng kiểm tra cấu hình Azure Speech.' });
                                                    }
                                                } catch (err) {
                                                    console.error("AI audio generation error:", err);
                                                    setNotification({ type: 'error', message: 'Lỗi khi tạo âm thanh: ' + err.message });
                                                } finally {
                                                    setIsGeneratingAudio(false);
                                                }
                                            }}
                                            disabled={isGeneratingAudio || !customAudioText.trim()}
                                            className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            {isGeneratingAudio && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Tạo âm thanh
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Dictionary Item Modal */}
            {deletingDictItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xóa khỏi kho từ vựng chung?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Bạn có chắc chắn muốn xóa từ vựng này khỏi kho từ vựng dùng chung? Người dùng khác sẽ không thể tra cứu từ này nữa (nhưng không mất các từ họ đã lưu về thư viện riêng).
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setDeletingDictItem(null)}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteDictItem}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold text-sm transition-all"
                            >
                                Xóa ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVocabularySection;
