import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

const ProfileScreen = ({ onSave }) => {
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!displayName.trim()) return;
        setIsLoading(true);
        await onSave(displayName);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-10 space-y-8 border border-white/50">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800">QuizKi</h2>
                    <p className="text-gray-500 text-sm">Học từ vựng tiếng Nhật thông minh</p>
                </div>

                <div className="space-y-4">
                    <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700">
                        Bạn tên là gì?
                    </label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                        }}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-lg transition-all outline-none"
                        placeholder="Nhập tên hiển thị..."
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !displayName.trim()}
                    className="w-full px-6 py-4 text-lg font-bold rounded-xl shadow-lg shadow-indigo-200 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:translate-y-[-2px]"
                >
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6 mx-auto" /> : "Bắt đầu hành trình"}
                </button>
            </div>
        </div>
    );
};

export default ProfileScreen;
