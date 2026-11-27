import React, { useState, useMemo } from 'react';
import { TrendingDown, Plus, Trash2, Loader2 } from 'lucide-react';
import { addExpense, deleteExpense } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const EXPENSE_TYPE_META = {
    fixed: { label: 'Cố định', emoji: '🏢', badge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
    operating: { label: 'Vận hành', emoji: '⚙️', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    other: { label: 'Khác', emoji: '📦', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

const AdminExpenseManager = ({
    expenses = [],
    formatVND,
    currentUserId,
    setNotification,
    savingConfig,
    setSavingConfig
}) => {
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        type: 'operating',
        recurring: 'monthly',
        description: '',
        month: new Date().toISOString().slice(0, 7)
    });
    const [expenseError, setExpenseError] = useState('');
    const [expenseFilter, setExpenseFilter] = useState('all');

    const filteredExpenseList = useMemo(() => {
        if (expenseFilter === 'all') return expenses;
        return expenses.filter(e => e.type === expenseFilter);
    }, [expenses, expenseFilter]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setExpenseError('');
        if (!newExpense.name.trim()) {
            setExpenseError('Vui lòng nhập tên chi phí');
            return;
        }
        const numericAmount = Number(String(newExpense.amount).replace(/[^\d]/g, ''));
        if (!numericAmount || numericAmount <= 0) {
            setExpenseError('Vui lòng nhập số tiền hợp lệ');
            return;
        }
        setSavingConfig(true);
        const result = await addExpense({ ...newExpense, amount: numericAmount }, currentUserId);
        if (result.success) {
            setNotification({ type: 'success', message: `Đã thêm chi phí: ${newExpense.name}` });
            setNewExpense({
                name: '',
                amount: '',
                type: 'operating',
                recurring: 'monthly',
                description: '',
                month: new Date().toISOString().slice(0, 7)
            });
        } else {
            setExpenseError(result.error || 'Lỗi thêm chi phí');
        }
        setSavingConfig(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Add Expense Form */}
            <form onSubmit={handleAddExpense} className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-3 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-rose-500" />
                    Thêm khoản chi phí
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tên chi phí</label>
                        <input
                            type="text"
                            value={newExpense.name}
                            onChange={(e) => setNewExpense(v => ({ ...v, name: e.target.value }))}
                            placeholder="VD: Hosting, Domain, API..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Số tiền (VND)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense(v => ({ ...v, amount: e.target.value }))}
                            placeholder="200000"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Loại</label>
                        <select
                            value={newExpense.type}
                            onChange={(e) => setNewExpense(v => ({ ...v, type: e.target.value }))}
                            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        >
                            <option value="fixed">Cố định</option>
                            <option value="operating">Vận hành</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Chu kỳ</label>
                        <select
                            value={newExpense.recurring}
                            onChange={(e) => setNewExpense(v => ({ ...v, recurring: e.target.value }))}
                            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        >
                            <option value="monthly">Hàng tháng</option>
                            <option value="yearly">Hàng năm</option>
                            <option value="once">Một lần</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tháng</label>
                        <input
                            type="month"
                            value={newExpense.month}
                            onChange={(e) => setNewExpense(v => ({ ...v, month: e.target.value }))}
                            className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ghi chú</label>
                    <input
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense(v => ({ ...v, description: e.target.value }))}
                        placeholder="Mô tả chi phí (tuỳ chọn)"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                </div>

                {expenseError && <p className="text-xs text-rose-500 font-bold">{expenseError}</p>}

                <button
                    type="submit"
                    disabled={savingConfig}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 border-b-4 border-rose-700 active:translate-y-0.5 active:border-b-2 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                    {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Thêm chi phí
                </button>
            </form>

            {/* Expense List */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                        Danh sách chi phí ({filteredExpenseList.length})
                    </h3>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'fixed', label: 'Cố định' },
                            { id: 'operating', label: 'Vận hành' },
                            { id: 'other', label: 'Khác' }
                        ].map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setExpenseFilter(f.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    expenseFilter === f.id
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredExpenseList.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-bold">
                        Chưa có khoản chi phí nào.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {filteredExpenseList.map(exp => {
                            const meta = EXPENSE_TYPE_META[exp.type] || EXPENSE_TYPE_META.other;
                            const recurLabel = exp.recurring === 'monthly' ? 'Hàng tháng' : exp.recurring === 'yearly' ? 'Hàng năm' : 'Một lần';
                            return (
                                <div key={exp.id} className="p-3 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-extrabold text-sm text-slate-800 dark:text-white truncate">{exp.name}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badge}`}>
                                                {meta.emoji} {meta.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-slate-400">
                                            <span>{recurLabel}</span>
                                            <span>•</span>
                                            <span>{exp.month}</span>
                                            {exp.description && (
                                                <>
                                                    <span>•</span>
                                                    <span className="italic truncate max-w-[240px]">{exp.description}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-black text-rose-600 dark:text-rose-400">-{formatVND(exp.amount || 0)}</span>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!await showConfirm(`Xóa chi phí "${exp.name}"?`, { type: 'danger', confirmText: 'Xóa' })) return;
                                                setSavingConfig(true);
                                                await deleteExpense(exp.id);
                                                setNotification({ type: 'success', message: `Đã xóa chi phí ${exp.name}` });
                                                setSavingConfig(false);
                                            }}
                                            disabled={savingConfig}
                                            className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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

export default AdminExpenseManager;
