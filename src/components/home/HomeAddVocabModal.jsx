import React from 'react';
import { X, FolderPlus, ListPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';

const HomeAddVocabModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 w-10 h-10 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center select-none active:scale-95"
                    title={t('home.closeModal', 'Đóng cửa sổ')}
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 pr-10">
                    {t('home.addModalTitle', 'Thêm từ vựng mới')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    {t('home.addModalSub', 'Chọn phương thức thêm từ vựng phù hợp')}
                </p>

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            navigate(ROUTES.VOCAB_ADD);
                        }}
                        className="w-full flex items-center gap-4 p-4 min-h-[72px] text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-teal-500 transition-all cursor-pointer group select-none active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-teal-500 text-white shrink-0 flex items-center justify-center shadow-md">
                            <FolderPlus className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                {t('home.createFolderTitle', 'Tạo học phần mới')}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                                {t('home.createFolderSub', 'Tạo học phần hoàn chỉnh với tên và từ vựng.')}
                            </p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            navigate(ROUTES.VOCAB_QUICK_ADD);
                        }}
                        className="w-full flex items-center gap-4 p-4 min-h-[72px] text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-amber-500 transition-all cursor-pointer group select-none active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0 flex items-center justify-center shadow-md">
                            <ListPlus className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {t('home.quickAddTitle', 'Thêm nhanh từ vựng')}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                                {t('home.quickAddSub', 'Nhập nhanh danh sách từ vựng từ bất kỳ đâu.')}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeAddVocabModal;

