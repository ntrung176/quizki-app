import React from 'react';
import { Wrench, RefreshCw, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

const DEFAULT_MAINTENANCE_MSG =
    'QuizKi đang thực hiện nâng cấp và bảo trì định kỳ để mang lại trải nghiệm tốt nhất cho bạn. Chúng tôi sẽ trở lại trong thời gian sớm nhất.';

const MaintenanceScreen = ({ message, isAuthenticated = false }) => {
    const navigate = useNavigate();

    const handleSwitchToAdmin = async () => {
        if (isAuthenticated && auth) {
            try {
                await signOut(auth);
            } catch (_) {
                // ignore signOut errors
            }
        }
        navigate('/login');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 text-center space-y-5 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-white flex items-center justify-center mx-auto shadow-md">
                    <Wrench className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Hệ thống đang bảo trì
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        QuizKi đang nâng cấp hệ thống
                    </h1>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border-2 border-slate-200/80 dark:border-slate-700/70 text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {(message && message.trim()) || DEFAULT_MAINTENANCE_MSG}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Kiểm tra lại
                    </button>

                    <button
                        type="button"
                        onClick={handleSwitchToAdmin}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-b-4 border-slate-300 dark:border-slate-600 active:translate-y-0.5 active:border-b-2 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        {isAuthenticated ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                        {isAuthenticated ? 'Đổi sang tài khoản Admin' : 'Đăng nhập Admin'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceScreen;
