import React, { useState } from 'react';
import { Plus, Ticket, Loader2, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { createVoucher, toggleVoucher, deleteVoucher } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const AdminVouchersSection = ({
    vouchers = [],
    currentUserId,
    setNotification,
    formatVND,
    savingConfig,
    setSavingConfig
}) => {
    const [newVoucher, setNewVoucher] = useState({
        code: '',
        discountType: 'percent',
        discountValue: '',
        maxUses: '',
        expiresAt: '',
        description: ''
    });
    const [voucherError, setVoucherError] = useState('');

    const handleCreateVoucher = async (e) => {
        e.preventDefault();
        setVoucherError('');
        if (!newVoucher.code.trim()) { setVoucherError('Vui lòng nhập mã voucher'); return; }
        if (!newVoucher.discountValue || Number(newVoucher.discountValue) <= 0) { setVoucherError('Nhập giá trị giảm hợp lệ'); return; }
        if (newVoucher.discountType === 'percent' && Number(newVoucher.discountValue) > 100) { setVoucherError('Phần trăm giảm tối đa 100%'); return; }

        setSavingConfig(true);
        const result = await createVoucher({
            ...newVoucher,
            expiresAt: newVoucher.expiresAt ? new Date(newVoucher.expiresAt + 'T23:59:59').toISOString() : null,
        }, currentUserId);
        if (result.success) {
            setNotification({ type: 'success', message: `Đã tạo voucher ${newVoucher.code}` });
            setNewVoucher({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '', description: '' });
        } else {
            setVoucherError(result.error || 'Lỗi tạo voucher');
        }
        setSavingConfig(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Create Voucher Form */}
            <form onSubmit={handleCreateVoucher} className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-3.5 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-500" />
                    Tạo Voucher ưu đãi mới
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mã voucher</label>
                        <input
                            type="text"
                            value={newVoucher.code}
                            onChange={(e) => setNewVoucher(v => ({ ...v, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                            placeholder="VD: SALE50"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mô tả</label>
                        <input
                            type="text"
                            value={newVoucher.description}
                            onChange={(e) => setNewVoucher(v => ({ ...v, description: e.target.value }))}
                            placeholder="Ưu đãi mùa thi..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Loại giảm</label>
                        <select
                            value={newVoucher.discountType}
                            onChange={(e) => setNewVoucher(v => ({ ...v, discountType: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        >
                            <option value="percent">% Phần trăm</option>
                            <option value="fixed">VND Cố định</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                            {newVoucher.discountType === 'percent' ? 'Giảm (%)' : 'Giảm (VND)'}
                        </label>
                        <input
                            type="number"
                            value={newVoucher.discountValue}
                            onChange={(e) => setNewVoucher(v => ({ ...v, discountValue: e.target.value }))}
                            placeholder={newVoucher.discountType === 'percent' ? '50' : '20000'}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Số lượt (0 = ∞)</label>
                        <input
                            type="number"
                            value={newVoucher.maxUses}
                            onChange={(e) => setNewVoucher(v => ({ ...v, maxUses: e.target.value }))}
                            placeholder="100"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hạn sử dụng</label>
                        <input
                            type="date"
                            value={newVoucher.expiresAt}
                            onChange={(e) => setNewVoucher(v => ({ ...v, expiresAt: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {voucherError && <p className="text-xs text-rose-500 font-bold">{voucherError}</p>}

                <button
                    type="submit"
                    disabled={savingConfig}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                    {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    Tạo Voucher
                </button>
            </form>

            {/* Voucher List */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-3 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-500" />
                    Danh sách Voucher ({vouchers.length})
                </h3>

                {vouchers.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-bold">
                        Chưa có voucher nào được tạo.
                    </div>
                ) : (
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {vouchers.map(v => {
                            const expiryDate = v.expiresAt ? (v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt)) : null;
                            const isExpired = Boolean(expiryDate && new Date() > expiryDate);
                            const isUsedUp = v.maxUses > 0 && v.usedCount >= v.maxUses;
                            const isLive = Boolean(v.active && !isExpired && !isUsedUp);

                            return (
                                <div
                                    key={v.id}
                                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                                        isLive
                                            ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/25'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-75'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-xs border-b-2 shrink-0 ${
                                            isLive ? 'bg-amber-500 border-amber-700' : 'bg-slate-400 border-slate-600'
                                        }`}>
                                            {v.discountType === 'percent' ? `${v.discountValue}%` : `${Math.round(v.discountValue / 1000)}K`}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-black text-slate-900 dark:text-white font-mono text-sm truncate">{v.code}</p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                                    isLive
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                        : isExpired
                                                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                                }`}>
                                                    {isLive ? 'Đang chạy' : isExpired ? 'Hết hạn' : isUsedUp ? 'Hết lượt' : 'Đang tắt'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                <span className="font-bold">
                                                    {v.discountType === 'percent' ? `Giảm ${v.discountValue}%` : `Giảm ${formatVND(v.discountValue)}`}
                                                </span>
                                                <span>•</span>
                                                <span>Đã dùng: {v.usedCount || 0}{v.maxUses > 0 ? `/${v.maxUses}` : '/∞'}</span>
                                                {expiryDate && (
                                                    <>
                                                        <span>•</span>
                                                        <span className={isExpired ? 'text-rose-500 font-bold' : ''}>
                                                            HSD: {expiryDate.toLocaleDateString('vi-VN')}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {v.description && (
                                                <p className="text-[11px] text-slate-400 italic truncate mt-0.5">{v.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setSavingConfig(true);
                                                await toggleVoucher(v.code, !v.active);
                                                setNotification({ type: 'success', message: v.active ? `Đã tắt voucher ${v.code}` : `Đã bật voucher ${v.code}` });
                                                setSavingConfig(false);
                                            }}
                                            disabled={savingConfig}
                                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            title={v.active ? 'Tắt voucher' : 'Bật voucher'}
                                        >
                                            {v.active
                                                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                                                : <ToggleLeft className="w-7 h-7 text-slate-400" />
                                            }
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!await showConfirm(`Xóa voucher ${v.code}?`, { type: 'danger', confirmText: 'Xóa' })) return;
                                                setSavingConfig(true);
                                                await deleteVoucher(v.code);
                                                setNotification({ type: 'success', message: `Đã xóa voucher ${v.code}` });
                                                setSavingConfig(false);
                                            }}
                                            disabled={savingConfig}
                                            className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Xóa voucher"
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

export default AdminVouchersSection;
