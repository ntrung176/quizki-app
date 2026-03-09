import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingIndicator = ({ text = 'Đang tải...' }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">{text}</p>
        </div>
    );
};

export default LoadingIndicator;
