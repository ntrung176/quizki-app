import React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import UpdateNotification from '../ui/UpdateNotification';

export const GlobalModalsContainer = ({
    updateAvailable,
    refreshApp,
    dismissUpdate,
    activePopup,
    handleDismissPopup,
    showBatchImportModal,
    setShowBatchImportModal,
    batchVocabInput,
    setBatchVocabInput,
    isProcessingBatch,
    handleBatchImportFromText,
    setNotification
}) => {
    return (
        <>
            {/* Update notification when new version is deployed */}
            {updateAvailable && (
                <UpdateNotification onRefresh={refreshApp} onDismiss={dismissUpdate} />
            )}

            {/* Modal thông báo khẩn cấp / Popup */}
            {activePopup && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white/95 dark:bg-slate-900/95 border border-indigo-100/50 dark:border-slate-800/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 transform scale-100 relative">
                        <div className="bg-gradient-to-r from-indigo-500 via-sky-500 to-pink-500 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                            <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner animate-bounce">
                                <Bell className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-black tracking-wide uppercase drop-shadow-md">Thông Báo Hệ Thống</h2>
                        </div>
                        <div className="p-6 md:p-8 space-y-4">
                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-slate-100 text-center leading-tight">
                                {activePopup.title}
                            </h3>
                            <div className="text-sm text-gray-600 dark:text-slate-350 leading-relaxed max-h-[40vh] overflow-y-auto whitespace-pre-wrap pr-1 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                                {activePopup.message}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center">
                            <button
                                id="btn-close-popup-notification"
                                onClick={handleDismissPopup}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm rounded-2xl transition-all duration-300 transform active:scale-95 shadow-md shadow-indigo-600/10 dark:shadow-none hover:shadow-indigo-600/20 cursor-pointer min-w-[140px] text-center"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nhập từ vựng hàng loạt */}
            {showBatchImportModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Thêm từ vựng hàng loạt</h2>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">Mỗi từ vựng trên một dòng</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            <textarea
                                value={batchVocabInput}
                                onChange={(e) => setBatchVocabInput(e.target.value)}
                                placeholder="適当&#10;高まる&#10;現れる&#10;低下&#10;真実&#10;ガム&#10;環境汚染&#10;健康&#10;沈む&#10;支払い"
                                className="w-full h-64 md:h-80 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono"
                            />
                        </div>
                        <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBatchImportModal(false);
                                    setBatchVocabInput('');
                                }}
                                className="flex-1 px-4 py-2 md:py-3 text-sm md:text-base font-medium rounded-lg md:rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={async () => {
                                    if (!batchVocabInput.trim()) {
                                        if (setNotification) setNotification('Vui lòng nhập danh sách từ vựng!');
                                        return;
                                    }
                                    const vocabList = batchVocabInput
                                        .split('\n')
                                        .map(line => line.trim())
                                        .filter(line => line.length > 0);

                                    if (vocabList.length === 0) {
                                        if (setNotification) setNotification('Không tìm thấy từ vựng nào!');
                                        return;
                                    }

                                    setBatchVocabInput('');
                                    await handleBatchImportFromText(vocabList);
                                }}
                                disabled={isProcessingBatch || !batchVocabInput.trim()}
                                className="flex-1 px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isProcessingBatch ? (
                                    <>
                                        <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 inline mr-2" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Nhập'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalModalsContainer;
