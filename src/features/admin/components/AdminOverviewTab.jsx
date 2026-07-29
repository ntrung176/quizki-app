import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Activity, Users, Shield, Clock, Wifi, RefreshCw } from 'lucide-react';

export const AdminOverviewTab = ({
    usersCount = 0,
    apiBalances,
    fetchApiBalances,
    expenses = [],
    selectedMonth,
    setSelectedMonth
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Người Dùng</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{usersCount}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-600 dark:text-cyan-400">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số Dư OpenRouter API</p>
                        <div className="flex items-center gap-2 mt-1">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                {apiBalances?.openRouter !== null && apiBalances?.openRouter !== undefined 
                                    ? `$${apiBalances.openRouter.toFixed(2)}` 
                                    : '---'}
                            </h3>
                            <button 
                                onClick={fetchApiBalances} 
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                                title="Làm mới số dư"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng Thái Hệ Thống</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">Hoạt động 100%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverviewTab;
