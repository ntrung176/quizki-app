import React, { useState, useEffect } from 'react';
import { launchFanfare } from '../../utils/celebrations';
import UnifiedStudyCompleteModal from './UnifiedStudyCompleteModal';

export const InternalCompleteModal = ({ handleRestart, onCompleteReview, onBack, totalCards }) => {
    return (
        <UnifiedStudyCompleteModal
            totalCards={totalCards || 0}
            title="Xuất sắc!"
            subtitle="Bạn đã hoàn thành phiên ôn tập này."
            onRestart={handleRestart}
            onComplete={() => {
                if (onCompleteReview) onCompleteReview(null);
                else if (onBack) onBack();
            }}
            onBack={onBack}
        />
    );
};

export const ReviewCompleteScreen = ({ onBack, allCards }) => {
    const [cycleText, setCycleText] = useState('⏳ Đang tính toán chu kì...');
    const [showCycle, setShowCycle] = useState(false);

    useEffect(() => {
        launchFanfare();

        const timer = setTimeout(() => {
            if (allCards && allCards.length > 0) {
                const now = Date.now();
                const futureCards = allCards
                    .filter(c => c.intervalIndex_back >= 0 && c.nextReview_back && c.nextReview_back > now)
                    .sort((a, b) => a.nextReview_back - b.nextReview_back);

                if (futureCards.length > 0) {
                    const nextTime = futureCards[0].nextReview_back;
                    const diffMs = nextTime - now;
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffHour = Math.floor(diffMin / 60);
                    const diffDay = Math.floor(diffHour / 24);

                    let timeText;
                    if (diffDay >= 1) {
                        timeText = `${diffDay} ngày`;
                    } else if (diffHour >= 1) {
                        timeText = `${diffHour} giờ ${diffMin % 60} phút`;
                    } else {
                        timeText = `${diffMin} phút`;
                    }
                    setCycleText(`✅ Bạn sẽ ôn tập lại sau ${timeText}. Hẹn gặp lại! 👋`);
                } else {
                    setCycleText('✅ Không còn thẻ nào đang chờ ôn tập.');
                }
            } else {
                setCycleText('✅ Hoàn thành!');
            }
            setShowCycle(true);
        }, 1500);

        const exitTimer = setTimeout(() => {
            onBack();
        }, 3000);

        return () => {
            clearTimeout(timer);
            clearTimeout(exitTimer);
        };
    }, [allCards, onBack]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onBack();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm animate-fade-in">
            <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 max-w-sm w-full bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl">
                <div className="text-6xl mb-2">🎉</div>
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Xuất sắc!</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                        Bạn đã hoàn thành phiên ôn tập này.
                    </p>
                </div>

                <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-all">
                        {cycleText}
                    </p>
                </div>

                <button
                    onClick={onBack}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1 cursor-pointer"
                >
                    Xong <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ReviewCompleteScreen;
