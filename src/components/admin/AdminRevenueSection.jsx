import React, { useMemo } from 'react';
import {
    Wifi, Loader2, RefreshCw, Bot, Calendar, Download, TrendingUp,
    TrendingDown, DollarSign, CreditCard, BarChart3, ChevronLeft, ChevronRight, Volume2
} from 'lucide-react';
import AdminExpenseManager from './AdminExpenseManager';
import {
    parseRecordDate,
    shiftMonth,
    filterTransactionsByMonth,
    filterExpensesByMonth,
    exportMonthlyRevenueExcel
} from './revenueExport';

const AdminRevenueSection = ({
    apiBalances,
    fetchApiBalances,
    selectedMonth,
    setSelectedMonth,
    creditRequests,
    expenses,
    users,
    formatVND,
    currentUserId,
    setNotification,
    savingConfig,
    setSavingConfig
}) => {
    const monthTxs = useMemo(() => filterTransactionsByMonth(creditRequests, selectedMonth), [creditRequests, selectedMonth]);
    const monthExpenses = useMemo(() => filterExpensesByMonth(expenses, selectedMonth), [expenses, selectedMonth]);

    const monthRevenue = useMemo(() => monthTxs.reduce((s, r) => s + (r.amount || 0), 0), [monthTxs]);
    const totalFixedCost = useMemo(() => monthExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + (e.amount || 0), 0), [monthExpenses]);
    const totalOperatingCost = useMemo(() => monthExpenses.filter(e => e.type === 'operating').reduce((s, e) => s + (e.amount || 0), 0), [monthExpenses]);
    const totalOtherCost = useMemo(() => monthExpenses.filter(e => e.type === 'other').reduce((s, e) => s + (e.amount || 0), 0), [monthExpenses]);

    const totalExpenses = totalFixedCost + totalOperatingCost + totalOtherCost;
    const profit = monthRevenue - totalExpenses;

    const allTimeRevenue = useMemo(
        () => creditRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0),
        [creditRequests]
    );
    const allTimeExpenses = useMemo(
        () => expenses.reduce((s, e) => s + (e.amount || 0), 0),
        [expenses]
    );
    const allTimeProfit = allTimeRevenue - allTimeExpenses;

    const revenueRatioPct = monthRevenue + totalExpenses > 0
        ? Math.round((monthRevenue / (monthRevenue + totalExpenses)) * 100)
        : 50;

    const handleExportExcel = () => {
        exportMonthlyRevenueExcel({ selectedMonth, monthTxs, monthExps: monthExpenses, users });
        setNotification({ type: 'success', message: `Đã xuất file Excel tháng ${selectedMonth}` });
    };

    return (
        <div className="space-y-5">
            {/* API Balance & Period Toolbar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <Wifi className="w-4 h-4 text-sky-500" />
                            Số dư API bên thứ 3
                        </h3>
                        <button
                            type="button"
                            onClick={fetchApiBalances}
                            disabled={apiBalances.loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {apiBalances.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {apiBalances.loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-200">OpenRouter</span>
                                </div>
                                {apiBalances.openRouter?.isProxy && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black">
                                        Proxy
                                    </span>
                                )}
                            </div>
                            {apiBalances.openRouter === null ? (
                                <p className="text-xs text-slate-400 italic">Nhấn "Kiểm tra" để xem số dư</p>
                            ) : apiBalances.openRouter.error ? (
                                <p className="text-xs text-rose-500 font-medium">⚠️ {apiBalances.openRouter.error}</p>
                            ) : (
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                        <span>Tổng nạp / Đã dùng:</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                            ${apiBalances.openRouter.totalCredits?.toFixed(2)} / ${apiBalances.openRouter.totalUsage?.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-emerald-200/70 dark:border-emerald-800/60">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">Còn lại:</span>
                                        <span className={`font-black ${apiBalances.openRouter.remaining > 1 ? 'text-emerald-600 dark:text-emerald-400' : apiBalances.openRouter.remaining > 0.1 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            ${apiBalances.openRouter.remaining?.toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3.5 rounded-2xl border-2 border-sky-200 dark:border-sky-800/70 bg-sky-50/70 dark:bg-sky-950/30">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                                    <Volume2 className="w-4 h-4" />
                                </div>
                                <span className="font-extrabold text-xs text-sky-800 dark:text-sky-200">Azure Speech</span>
                            </div>
                            {apiBalances.speechGen === null ? (
                                <p className="text-xs text-slate-400 italic">Nhấn "Kiểm tra" để xem trạng thái</p>
                            ) : apiBalances.speechGen.error ? (
                                <p className="text-xs text-rose-500 font-medium">⚠️ {apiBalances.speechGen.error}</p>
                            ) : (
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">Trạng thái:</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">Hoạt động</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {apiBalances.speechGen.isProxy ? `Proxy (${apiBalances.speechGen.region})` : 'Key Azure trực tiếp'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Month Picker + Excel Export */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-4 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            Kỳ thống kê tài chính
                        </h3>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Xuất Excel
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Tháng trước"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white text-center outline-none focus:border-emerald-500"
                        />
                        <button
                            type="button"
                            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Tháng sau"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 6 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-emerald-200 dark:border-emerald-800/70">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Tháng {selectedMonth}</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatVND(monthRevenue)}</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Doanh thu tháng ({monthTxs.length} đơn)</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-rose-200 dark:border-rose-800/70">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Tháng {selectedMonth}</span>
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">{formatVND(totalExpenses)}</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Chi phí thực tế ({monthExpenses.length} khoản)</p>
                </div>

                <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 ${profit >= 0 ? 'border-sky-200 dark:border-sky-800/70' : 'border-amber-200 dark:border-amber-800/70'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${profit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}`}>Tháng {selectedMonth}</span>
                        <DollarSign className={`w-4 h-4 ${profit >= 0 ? 'text-sky-500' : 'text-amber-500'}`} />
                    </div>
                    <p className={`text-xl font-black ${profit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {profit >= 0 ? '+' : ''}{formatVND(profit)}
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{profit >= 0 ? 'Lợi nhuận ròng tháng' : 'Âm dòng tiền tháng'}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">Tích lũy</span>
                        <CreditCard className="w-4 h-4 text-sky-500" />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{formatVND(allTimeRevenue)}</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Tổng doanh thu</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Tích lũy</span>
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">{formatVND(allTimeExpenses)}</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Tổng chi phí đã ghi nhận</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Tích lũy</span>
                        <DollarSign className={`w-4 h-4 ${allTimeProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                    </div>
                    <p className={`text-xl font-black ${allTimeProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {allTimeProfit >= 0 ? '+' : ''}{formatVND(allTimeProfit)}
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Tổng lợi nhuận ròng</p>
                </div>
            </div>

            {/* Breakdown & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        Cơ cấu thu chi tháng {selectedMonth}
                    </h3>

                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">Thu ({revenueRatioPct}%)</span>
                            <span className="text-rose-500">Chi ({100 - revenueRatioPct}%)</span>
                        </div>
                        <div className="h-3 rounded-full bg-rose-200 dark:bg-rose-950/60 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${revenueRatioPct}%` }} />
                        </div>
                    </div>

                    <div className="space-y-2.5 text-sm">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl flex items-center justify-between">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">📈 Tổng thu ({monthTxs.length} đơn)</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{formatVND(monthRevenue)}</span>
                        </div>

                        <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/70 rounded-2xl flex items-center justify-between">
                            <span className="font-bold text-sky-700 dark:text-sky-300">🏢 Chi phí cố định</span>
                            <span className="font-black text-sky-600 dark:text-sky-400">-{formatVND(totalFixedCost)}</span>
                        </div>

                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-2xl flex items-center justify-between">
                            <span className="font-bold text-amber-700 dark:text-amber-300">⚙️ Chi phí vận hành</span>
                            <span className="font-black text-amber-600 dark:text-amber-400">-{formatVND(totalOperatingCost)}</span>
                        </div>

                        {totalOtherCost > 0 && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                                <span className="font-bold text-slate-600 dark:text-slate-300">📦 Chi phí khác</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">-{formatVND(totalOtherCost)}</span>
                            </div>
                        )}

                        <div className="pt-3 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="font-black text-slate-800 dark:text-white">
                                {profit >= 0 ? '✅ Lợi nhuận ròng' : '⚠️ Chênh lệch tháng'}
                            </span>
                            <span className={`text-base font-black ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {profit >= 0 ? '+' : ''}{formatVND(profit)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Giao dịch tháng {selectedMonth} ({monthTxs.length})
                    </h3>
                    {monthTxs.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-bold">
                            Chưa có giao dịch thanh toán nào trong tháng {selectedMonth}.
                        </div>
                    ) : (
                        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                            {monthTxs.map(r => {
                                const d = parseRecordDate(r.processedAt || r.createdAt);
                                const user = users.find(u => u.userId === r.userId);
                                const name = user?.displayName || r.userName || 'N/A';
                                return (
                                    <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                                                {name[0].toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">{name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {r.packageName || r.packageId}{user?.email ? ` • ${user.email}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{formatVND(r.amount || 0)}</p>
                                            <p className="text-[10px] text-slate-400">{d ? d.toLocaleDateString('vi-VN') : ''}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Expense Manager */}
            <AdminExpenseManager
                expenses={expenses}
                formatVND={formatVND}
                currentUserId={currentUserId}
                setNotification={setNotification}
                savingConfig={savingConfig}
                setSavingConfig={setSavingConfig}
            />
        </div>
    );
};

export default AdminRevenueSection;
