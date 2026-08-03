import React, { useState } from 'react';
import { Wifi, Loader2, RefreshCw, Bot, Calendar, Download, TrendingUp, TrendingDown, DollarSign, CreditCard, CheckCircle, AlertTriangle, BarChart3, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addExpense, deleteExpense } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const AdminRevenueSection = ({
    apiBalances,
    fetchApiBalances,
    selectedMonth,
    setSelectedMonth,
    creditRequests,
    expenses,
    stats,
    users,
    formatVND,
    currentUserId,
    setNotification,
    savingConfig,
    setSavingConfig
}) => {
    const [firebaseReadsPerUser, setFirebaseReadsPerUser] = useState(250);
    const [firebaseWritesPerUser, setFirebaseWritesPerUser] = useState(50);
    const [firebaseAvgCardSizeKb, setFirebaseAvgCardSizeKb] = useState(40);
    const [firebaseExchangeRate, setFirebaseExchangeRate] = useState(25400);
    const [includeFirebaseInExpenses, setIncludeFirebaseInExpenses] = useState(true);

    const [newExpense, setNewExpense] = useState({ name: '', amount: '', type: 'operating', recurring: 'monthly', description: '', month: new Date().toISOString().slice(0, 7) });
    const [expenseError, setExpenseError] = useState('');

    return (
        <div className="space-y-4">
            {/* API Credits Monitor */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-cyan-500" />
                        Số dư API bên thứ 3
                    </h3>
                    <button
                        onClick={fetchApiBalances}
                        disabled={apiBalances.loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {apiBalances.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {apiBalances.loading ? 'Đang tải...' : 'Kiểm tra'}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* OpenRouter */}
                    <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">OpenRouter</span>
                        </div>
                        {apiBalances.openRouter === null ? (
                            <p className="text-xs text-gray-400 italic">Nhấn "Kiểm tra" để xem số dư</p>
                        ) : apiBalances.openRouter.error ? (
                            <p className="text-xs text-red-500">⚠️ {apiBalances.openRouter.error}</p>
                        ) : (
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Tổng nạp:</span>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">${apiBalances.openRouter.totalCredits?.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Đã dùng:</span>
                                    <span className="text-xs font-bold text-orange-600">${apiBalances.openRouter.totalUsage?.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-indigo-200 dark:border-indigo-700">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Còn lại:</span>
                                    <span className={`text-sm font-bold ${apiBalances.openRouter.remaining > 1 ? 'text-emerald-600' : apiBalances.openRouter.remaining > 0.1 ? 'text-amber-600' : 'text-red-600'}`}>
                                        ${apiBalances.openRouter.remaining?.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Microsoft Azure Speech */}
                    <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">🔊</span>
                            </div>
                            <span className="font-bold text-sm text-sky-700 dark:text-sky-300">
                                Microsoft Azure Speech
                            </span>
                        </div>
                        {apiBalances.speechGen === null ? (
                            <p className="text-xs text-gray-400 italic">Nhấn "Kiểm tra" để xem trạng thái</p>
                        ) : apiBalances.speechGen.error ? (
                            <p className="text-xs text-red-500">⚠️ {apiBalances.speechGen.error}</p>
                        ) : (
                            <div className="space-y-1">
                                <div className="flex justify-between pt-1">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Trạng thái:</span>
                                    <span className="text-sm font-bold text-emerald-600">Đang hoạt động</span>
                                </div>
                                <p className="text-[10px] text-gray-400">
                                    {apiBalances.speechGen.isProxy
                                        ? `Kết nối qua Proxy Worker (Vùng: ${apiBalances.speechGen.region})`
                                        : 'Kết nối trực tiếp qua API Key Azure'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Month Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Thống kê theo tháng
                    </h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                        />
                        <button
                            onClick={() => {
                                // Gather data for Excel
                                const monthTxs = creditRequests.filter(r => {
                                    if (r.status !== 'approved') return false;
                                    const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                                    if (!date) return false;
                                    return date.toISOString().slice(0, 7) === selectedMonth;
                                });
                                const monthExps = expenses.filter(exp => {
                                    if (exp.recurring === 'monthly') return true;
                                    if (exp.recurring === 'yearly') return (exp.month || '').slice(5, 7) === selectedMonth.slice(5, 7);
                                    return exp.month === selectedMonth;
                                });

                                // Firebase cost calculation
                                const dailyReads = stats.activeToday * firebaseReadsPerUser;
                                const billableDailyReads = Math.max(0, dailyReads - 50000);
                                const dailyReadsCostUsd = billableDailyReads * 0.0000006;
                                const monthlyReadsCostVnd = Math.round(dailyReadsCostUsd * 30.5 * firebaseExchangeRate);

                                const dailyWrites = stats.activeToday * firebaseWritesPerUser;
                                const billableDailyWrites = Math.max(0, dailyWrites - 20000);
                                const dailyWritesCostUsd = billableDailyWrites * 0.0000018;
                                const monthlyWritesCostVnd = Math.round(dailyWritesCostUsd * 30.5 * firebaseExchangeRate);

                                const storageGb = ((stats.totalCards * firebaseAvgCardSizeKb) + (users.length * 5)) / (1024 * 1024);
                                const billableStorageGb = Math.max(0, storageGb - 1);
                                const monthlyStorageCostVnd = Math.round(billableStorageGb * 0.18 * firebaseExchangeRate);

                                const monthlyBandwidthGb = (dailyReads * 30.5 * 2) / (1024 * 1024);
                                const billableBandwidthGb = Math.max(0, monthlyBandwidthGb - 10);
                                const monthlyBandwidthCostVnd = Math.round(billableBandwidthGb * 0.12 * firebaseExchangeRate);

                                const totalFirebaseCostVnd = monthlyReadsCostVnd + monthlyWritesCostVnd + monthlyStorageCostVnd + monthlyBandwidthCostVnd;
                                const firebaseExpenses = includeFirebaseInExpenses ? totalFirebaseCostVnd : 0;

                                const totalRevenue = monthTxs.reduce((s, r) => s + (r.amount || 0), 0);
                                const totalFixed = monthExps.filter(e => e.type === 'fixed').reduce((s, e) => s + (e.amount || 0), 0);
                                const totalOp = monthExps.filter(e => e.type === 'operating').reduce((s, e) => s + (e.amount || 0), 0);
                                const totalOther = monthExps.filter(e => e.type === 'other').reduce((s, e) => s + (e.amount || 0), 0);
                                const totalExp = totalFixed + totalOp + totalOther + firebaseExpenses;
                                const profit = totalRevenue - totalExp;

                                // Sheet 1: Tổng quan
                                const summaryData = [
                                    ['BÁO CÁO DOANH THU THÁNG', selectedMonth],
                                    [],
                                    ['Hạng mục', 'Số tiền (VND)'],
                                    ['Doanh thu', totalRevenue],
                                    ['Chi phí cố định', totalFixed],
                                    ['Chi phí vận hành', totalOp + firebaseExpenses],
                                    ['Chi phí khác', totalOther],
                                    includeFirebaseInExpenses ? ['Trong đó Firebase Blaze (Ước tính)', totalFirebaseCostVnd] : null,
                                    ['Tổng chi phí', totalExp],
                                    [],
                                    ['LỢI NHUẬN RÒNG', profit],
                                    [],
                                    ['Số giao dịch', monthTxs.length],
                                ].filter(row => row !== null);
                                const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
                                ws1['!cols'] = [{ wch: 35 }, { wch: 20 }];

                                // Sheet 2: Giao dịch
                                const txHeaders = ['STT', 'Ngày', 'Người dùng', 'Email', 'Gói', 'Số thẻ', 'Số tiền (VND)'];
                                const txRows = monthTxs.map((r, i) => {
                                    const date = r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt);
                                    const user = users.find(u => u.userId === r.userId);
                                    return [i + 1, date.toLocaleDateString('vi-VN'), user?.displayName || r.userName || 'N/A', user?.email || r.userEmail || '', r.packageName || r.packageId, r.credits || 0, r.amount || 0];
                                });
                                const ws2 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
                                ws2['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

                                // Sheet 3: Chi phí
                                const expHeaders = ['STT', 'Tên', 'Loại', 'Chu kỳ', 'Tháng', 'Số tiền (VND)', 'Ghi chú'];
                                const typeMap = { fixed: 'Cố định', operating: 'Vận hành', other: 'Khác' };
                                const recurMap = { monthly: 'Hàng tháng', yearly: 'Hàng năm', once: 'Một lần' };
                                const expRows = monthExps.map((e, i) => [i + 1, e.name, typeMap[e.type] || e.type, recurMap[e.recurring] || e.recurring, e.month, e.amount || 0, e.description || '']);
                                if (includeFirebaseInExpenses) {
                                    expRows.push([expRows.length + 1, 'Firebase Blaze (Ước tính)', 'Vận hành', 'Hàng tháng', selectedMonth, totalFirebaseCostVnd, 'Tính toán tự động dựa trên số liệu DAU & Cards']);
                                }
                                const ws3 = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
                                ws3['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 30 }];

                                // Create workbook
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');
                                XLSX.utils.book_append_sheet(wb, ws2, 'Giao dịch');
                                XLSX.utils.book_append_sheet(wb, ws3, 'Chi phí');
                                XLSX.writeFile(wb, `DoanhThu_${selectedMonth}.xlsx`);
                                setNotification({ type: 'success', message: `Đã xuất Excel tháng ${selectedMonth}` });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors"
                            title="Xuất Excel"
                        >
                            <Download className="w-4 h-4" />
                            Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Revenue Stats Cards */}
            {(() => {
                // Revenue from approved credit requests in selected month
                const monthRevenue = creditRequests
                    .filter(r => {
                        if (r.status !== 'approved') return false;
                        const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                        if (!date) return false;
                        return date.toISOString().slice(0, 7) === selectedMonth;
                    })
                    .reduce((sum, r) => sum + (r.amount || 0), 0);

                const monthTransactions = creditRequests.filter(r => {
                    if (r.status !== 'approved') return false;
                    const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                    if (!date) return false;
                    return date.toISOString().slice(0, 7) === selectedMonth;
                }).length;

                // Expenses for selected month (recurring monthly expenses always count)
                const monthExpenses = expenses.filter(exp => {
                    if (exp.recurring === 'monthly') return true;
                    if (exp.recurring === 'yearly') {
                        const createdMonth = exp.month || '';
                        return createdMonth.slice(5, 7) === selectedMonth.slice(5, 7);
                    }
                    return exp.month === selectedMonth;
                });

                const totalFixedCost = monthExpenses.filter(e => e.type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);
                const totalOperatingCost = monthExpenses.filter(e => e.type === 'operating').reduce((sum, e) => sum + (e.amount || 0), 0);
                const totalOtherCost = monthExpenses.filter(e => e.type === 'other').reduce((sum, e) => sum + (e.amount || 0), 0);

                // Firebase Blaze estimation calculations:
                const dailyReads = stats.activeToday * firebaseReadsPerUser;
                const billableDailyReads = Math.max(0, dailyReads - 50000);
                const dailyReadsCostUsd = billableDailyReads * 0.0000006;
                const monthlyReadsCostVnd = Math.round(dailyReadsCostUsd * 30.5 * firebaseExchangeRate);

                const dailyWrites = stats.activeToday * firebaseWritesPerUser;
                const billableDailyWrites = Math.max(0, dailyWrites - 20000);
                const dailyWritesCostUsd = billableDailyWrites * 0.0000018;
                const monthlyWritesCostVnd = Math.round(dailyWritesCostUsd * 30.5 * firebaseExchangeRate);

                // 40 KB per card average, 5 KB per user profile
                const storageGb = ((stats.totalCards * firebaseAvgCardSizeKb) + (users.length * 5)) / (1024 * 1024);
                const billableStorageGb = Math.max(0, storageGb - 1);
                const monthlyStorageCostVnd = Math.round(billableStorageGb * 0.18 * firebaseExchangeRate);

                const monthlyBandwidthGb = (dailyReads * 30.5 * 2) / (1024 * 1024); // 2 KB payload per document read
                const billableBandwidthGb = Math.max(0, monthlyBandwidthGb - 10);
                const monthlyBandwidthCostVnd = Math.round(billableBandwidthGb * 0.12 * firebaseExchangeRate);

                const totalFirebaseCostVnd = monthlyReadsCostVnd + monthlyWritesCostVnd + monthlyStorageCostVnd + monthlyBandwidthCostVnd;

                const firebaseExpenses = includeFirebaseInExpenses ? totalFirebaseCostVnd : 0;
                const totalExpenses = totalFixedCost + totalOperatingCost + totalOtherCost + firebaseExpenses;
                const profit = monthRevenue - totalExpenses;

                // All-time stats
                const allTimeRevenue = creditRequests
                    .filter(r => r.status === 'approved')
                    .reduce((sum, r) => sum + (r.amount || 0), 0);

                const allTimeExpenses = expenses
                    .reduce((sum, e) => sum + (e.amount || 0), 0) + firebaseExpenses;

                const allTimeProfit = allTimeRevenue - allTimeExpenses;

                return (
                    <>
                        {/* Overview Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Monthly group */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Tháng này</span>
                                </div>
                                <p className="text-lg font-bold text-emerald-600">{formatVND(monthRevenue)}</p>
                                <p className="text-[10px] text-gray-500">Doanh thu tháng</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-red-600 uppercase">Tháng này</span>
                                </div>
                                <p className="text-lg font-bold text-red-600">{formatVND(totalExpenses)}</p>
                                <p className="text-[10px] text-gray-500">Chi phí tháng</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profit >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                                        <DollarSign className={`w-4 h-4 ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Tháng này</span>
                                </div>
                                <p className={`text-lg font-bold ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{profit >= 0 ? '+' : ''}{formatVND(profit)}</p>
                                <p className="text-[10px] text-gray-500">{profit >= 0 ? 'Lợi nhuận' : 'Lỗ'} tháng</p>
                            </div>

                            {/* All-time group */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                                        <CreditCard className="w-4 h-4 text-sky-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-sky-600 uppercase">Tất cả</span>
                                </div>
                                <p className="text-lg font-bold text-sky-600">{formatVND(allTimeRevenue)}</p>
                                <p className="text-[10px] text-gray-500">Tổng doanh thu</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-red-600 uppercase">Tất cả</span>
                                </div>
                                <p className="text-lg font-bold text-red-600">{formatVND(allTimeExpenses)}</p>
                                <p className="text-[10px] text-gray-500">Tổng chi phí</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${allTimeProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                        <DollarSign className={`w-4 h-4 ${allTimeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${allTimeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Tất cả</span>
                                </div>
                                <p className={`text-lg font-bold ${allTimeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{allTimeProfit >= 0 ? '+' : ''}{formatVND(allTimeProfit)}</p>
                                <p className="text-[10px] text-gray-500">Tổng lợi nhuận</p>
                            </div>
                        </div>

                        {/* Firebase Blaze Cost Estimator Panel */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-orange-500" />
                                Ước tính Chi phí Firebase (Gói Blaze)
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Firebase Blaze tính phí dựa trên sử dụng thực tế. Dưới đây là ước tính chi phí dựa trên số lượng người dùng và thẻ hiện tại.
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reads/DAU/Ngày</label>
                                    <input
                                        type="number"
                                        value={firebaseReadsPerUser}
                                        onChange={(e) => setFirebaseReadsPerUser(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Writes/DAU/Ngày</label>
                                    <input
                                        type="number"
                                        value={firebaseWritesPerUser}
                                        onChange={(e) => setFirebaseWritesPerUser(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Dung lượng/Thẻ (KB)</label>
                                    <input
                                        type="number"
                                        value={firebaseAvgCardSizeKb}
                                        onChange={(e) => setFirebaseAvgCardSizeKb(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tỷ giá USD/VND</label>
                                    <input
                                        type="number"
                                        value={firebaseExchangeRate}
                                        onChange={(e) => setFirebaseExchangeRate(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            {/* Cost breakdown table */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-150 dark:border-gray-805 text-xs space-y-3">
                                <div className="flex justify-between items-center text-gray-400">
                                    <span>Thông số hệ thống:</span>
                                    <span className="font-semibold">{users.length} Users • {stats.totalCards} Cards • {stats.activeToday} DAU</span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-800 pt-2 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">📖 Firestore Reads: {new Intl.NumberFormat().format(dailyReads * 30.5)} lượt/tháng (Miễn phí: 50k/ngày)</span>
                                        <span className="font-bold text-gray-750 dark:text-gray-300">{formatVND(monthlyReadsCostVnd)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">✍️ Firestore Writes: {new Intl.NumberFormat().format(dailyWrites * 30.5)} lượt/tháng (Miễn phí: 20k/ngày)</span>
                                        <span className="font-bold text-gray-750 dark:text-gray-300">{formatVND(monthlyWritesCostVnd)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">💾 Firestore Storage: {storageGb.toFixed(3)} GB (Miễn phí: 1 GB)</span>
                                        <span className="font-bold text-gray-750 dark:text-gray-300">{formatVND(monthlyStorageCostVnd)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">🌐 Băng thông (Network Egress): {monthlyBandwidthGb.toFixed(2)} GB (Miễn phí: 10 GB)</span>
                                        <span className="font-bold text-gray-750 dark:text-gray-300">{formatVND(monthlyBandwidthCostVnd)}</span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-205 dark:border-gray-800 pt-2 flex justify-between items-center font-bold text-sm">
                                    <span className="text-gray-800 dark:text-white">🔥 Tổng chi phí Firebase Blaze ước tính:</span>
                                    <span className="text-orange-600 dark:text-orange-400">{formatVND(totalFirebaseCostVnd)} (~${(totalFirebaseCostVnd / firebaseExchangeRate).toFixed(2)})</span>
                                </div>
                                
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setIncludeFirebaseInExpenses(!includeFirebaseInExpenses)}
                                        className="text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold text-xs"
                                    >
                                        {includeFirebaseInExpenses ? (
                                            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Đang cộng dồn vào tổng chi phí tháng</span>
                                        ) : (
                                            <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Bấm để cộng dồn vào tổng chi phí tháng</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-indigo-500" />
                                Chi tiết thu chi tháng {selectedMonth}
                            </h3>
                            <div className="space-y-3">
                                {/* Revenue detail */}
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">📈 Doanh thu</span>
                                        <span className="text-sm font-bold text-emerald-600">{formatVND(monthRevenue)}</span>
                                    </div>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-500">{monthTransactions} giao dịch thanh toán</p>
                                </div>

                                {/* Expenses detail */}
                                {totalFixedCost > 0 && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">🏢 Chi phí cố định</span>
                                            <span className="text-sm font-bold text-blue-600">-{formatVND(totalFixedCost)}</span>
                                        </div>
                                    </div>
                                )}
                                {totalOperatingCost > 0 && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">⚙️ Chi phí vận hành</span>
                                            <span className="text-sm font-bold text-amber-600">-{formatVND(totalOperatingCost)}</span>
                                        </div>
                                    </div>
                                )}
                                {includeFirebaseInExpenses && totalFirebaseCostVnd > 0 && (
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-orange-750 dark:text-orange-400">🔥 Firebase Blaze (Ước tính)</span>
                                            <span className="text-sm font-bold text-orange-600">-{formatVND(totalFirebaseCostVnd)}</span>
                                        </div>
                                    </div>
                                )}
                                {totalOtherCost > 0 && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-400">📦 Chi phí khác</span>
                                            <span className="text-sm font-bold text-gray-600">-{formatVND(totalOtherCost)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Profit line */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-800 dark:text-white">{profit >= 0 ? '✅ Lợi nhuận ròng' : '⚠️ Lỗ ròng'}</span>
                                        <span className={`text-base font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{profit >= 0 ? '+' : ''}{formatVND(profit)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Giao dịch tháng {selectedMonth} ({monthTransactions})
                            </h3>
                            {monthTransactions === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4">Chưa có giao dịch nào trong tháng này.</p>
                            ) : (
                                <div className="max-h-[250px] overflow-y-auto space-y-1.5">
                                    {creditRequests
                                        .filter(r => {
                                            if (r.status !== 'approved') return false;
                                            const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                                            if (!date) return false;
                                            return date.toISOString().slice(0, 7) === selectedMonth;
                                        })
                                        .map(r => {
                                            const date = r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt);
                                            const user = users.find(u => u.userId === r.userId);
                                            return (
                                                <div key={r.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                            {(user?.displayName || r.userName || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-800 dark:text-white">{user?.displayName || r.userName || 'N/A'}</p>
                                                            <p className="text-[10px] text-gray-400">{r.packageName || r.packageId} • {r.credits} thẻ</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-emerald-600">+{formatVND(r.amount || 0)}</p>
                                                        <p className="text-[10px] text-gray-400">{date.toLocaleDateString('vi-VN')}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}

            {/* Add Expense */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-red-500" />
                    Thêm chi phí
                </h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Tên chi phí</label>
                            <input
                                type="text"
                                value={newExpense.name}
                                onChange={(e) => setNewExpense(v => ({ ...v, name: e.target.value }))}
                                placeholder="VD: Hosting, API, Domain..."
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Số tiền (VND)</label>
                            <input
                                type="text" inputMode="numeric"
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense(v => ({ ...v, amount: e.target.value }))}
                                placeholder="50000"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Loại</label>
                            <select
                                value={newExpense.type}
                                onChange={(e) => setNewExpense(v => ({ ...v, type: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            >
                                <option value="fixed">🏢 Cố định</option>
                                <option value="operating">⚙️ Vận hành</option>
                                <option value="other">📦 Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Chu kỳ</label>
                            <select
                                value={newExpense.recurring}
                                onChange={(e) => setNewExpense(v => ({ ...v, recurring: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            >
                                <option value="monthly">Hàng tháng</option>
                                <option value="yearly">Hàng năm</option>
                                <option value="once">Một lần</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Tháng</label>
                            <input
                                type="month"
                                value={newExpense.month}
                                onChange={(e) => setNewExpense(v => ({ ...v, month: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Ghi chú</label>
                        <input
                            type="text"
                            value={newExpense.description}
                            onChange={(e) => setNewExpense(v => ({ ...v, description: e.target.value }))}
                            placeholder="Mô tả chi phí (tùy chọn)"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                        />
                    </div>
                    {expenseError && (
                        <p className="text-xs text-red-500 font-medium">{expenseError}</p>
                    )}
                    <button
                        onClick={async () => {
                            setExpenseError('');
                            if (!newExpense.name.trim()) { setExpenseError('Nhập tên chi phí'); return; }
                            if (!newExpense.amount || Number(newExpense.amount) <= 0) { setExpenseError('Nhập số tiền hợp lệ'); return; }
                            setSavingConfig(true);
                            const result = await addExpense(newExpense, currentUserId);
                            if (result.success) {
                                setNotification({ type: 'success', message: `Đã thêm chi phí: ${newExpense.name}` });
                                setNewExpense({ name: '', amount: '', type: 'operating', recurring: 'monthly', description: '', month: new Date().toISOString().slice(0, 7) });
                            } else {
                                setExpenseError(result.error || 'Lỗi thêm chi phí');
                            }
                            setSavingConfig(false);
                        }}
                        disabled={savingConfig}
                        className="w-full py-2.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-red-600 hover:to-orange-700 disabled:opacity-50 transition-all"
                    >
                        {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Thêm chi phí
                    </button>
                </div>
            </div>

            {/* Expense List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Danh sách chi phí ({expenses.length})
                </h3>
                {expenses.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có chi phí nào.</p>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {expenses.map(exp => {
                            const typeLabel = exp.type === 'fixed' ? '🏢 Cố định' : exp.type === 'operating' ? '⚙️ Vận hành' : '📦 Khác';
                            const recurLabel = exp.recurring === 'monthly' ? 'Hàng tháng' : exp.recurring === 'yearly' ? 'Hàng năm' : 'Một lần';
                            const typeBg = exp.type === 'fixed' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : exp.type === 'operating' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700';
                            return (
                                <div key={exp.id} className={`p-3 rounded-xl border ${typeBg}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-white">{exp.name}</p>
                                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                <span className="text-xs text-gray-500">{typeLabel}</span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">{recurLabel}</span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">{exp.month}</span>
                                                {exp.description && (
                                                    <>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-400 italic">{exp.description}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-red-600">-{formatVND(exp.amount || 0)}</span>
                                            <button
                                                onClick={async () => {
                                                    if (!await showConfirm(`Xóa chi phí "${exp.name}"?`, { type: 'danger', confirmText: 'Xóa' })) return;
                                                    setSavingConfig(true);
                                                    await deleteExpense(exp.id);
                                                    setNotification({ type: 'success', message: `Đã xóa chi phí ${exp.name}` });
                                                    setSavingConfig(false);
                                                }}
                                                disabled={savingConfig}
                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRevenueSection;
