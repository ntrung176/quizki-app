import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

/**
 * Banner notification that appears when a new version of the app is deployed.
 * Provides a button to refresh the page and a dismiss button.
 */
const UpdateNotification = ({ onRefresh, onDismiss }) => {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-500/40 border border-indigo-400/30 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <span className="text-sm font-semibold whitespace-nowrap">
                        Có bản cập nhật mới!
                    </span>
                </div>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                    <RefreshCw className="w-4 h-4" />
                    Cập nhật ngay
                </button>
                <button
                    onClick={onDismiss}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                    title="Bỏ qua"
                >
                    <X className="w-4 h-4 opacity-70" />
                </button>
            </div>

            <style>{`
                @keyframes slide-up {
                    from {
                        transform: translate(-50%, 100px);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default UpdateNotification;
