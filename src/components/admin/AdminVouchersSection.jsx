import React, { useState } from 'react';
import { Plus, Ticket, Loader2, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { createVoucher, toggleVoucher, deleteVoucher } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const AdminVouchersSection = ({
    vouchers,
    currentUserId,
    setNotification,
    formatVND,
    savingConfig,
    setSavingConfig
}) => {
    const [newVoucher, setNewVoucher] = useState({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '', description: '' });
    const [voucherError, setVoucherError] = useState('');

    return (
        <div className="space-y-4">
            {/* Create Voucher */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-500" />
                    Tạo Voucher mới
                </h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Mã voucher</label>
                            <input
                                type="text"
                                value={newVoucher.code}
                                onChange={(e) => setNewVoucher(v => ({ ...v, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                placeholder="VD: SALE50, FREECREDIT"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none font-mono uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Mô tả</label>
                            <input
                                type="text"
                                value={newVoucher.description}
                                onChange={(e) => setNewVoucher(v => ({ ...v, description: e.target.value }))}
                                placeholder="Giảm giá Tết 2026"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Loại giảm</label>
                            <select
                                value={newVoucher.discountType}
                                onChange={(e) => setNewVoucher(v => ({ ...v, discountType: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            >
                                <option value="percent">% Phần trăm</option>
                                <option value="fixed">VND Cố định</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                                {newVoucher.discountType === 'percent' ? 'Giảm (%)' : 'Giảm (VND)'}
                            </label>
                            <input
                                type="number"
                                value={newVoucher.discountValue}
                                onChange={(e) => setNewVoucher(v => ({ ...v, discountValue: e.target.value }))}
                                placeholder={newVoucher.discountType === 'percent' ? '50' : '20000'}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Số lượt (0=∞)</label>
                            <input
                                type="number"
                                value={newVoucher.maxUses}
                                onChange={(e) => setNewVoucher(v => ({ ...v, maxUses: e.target.value }))}
                                placeholder="100"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Hết hạn</label>
                            <input
                                type="date"
                                value={newVoucher.expiresAt}
                                onChange={(e) => setNewVoucher(v => ({ ...v, expiresAt: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                        </div>
                    </div>
                    {voucherError && (
                        <p className="text-xs text-red-500 font-medium">{voucherError}</p>
                    )}
                    <button
                        onClick={async () => {
                            setVoucherError('');
                            if (!newVoucher.code.trim()) { setVoucherError('Nhập mã voucher'); return; }
                            if (!newVoucher.discountValue || Number(newVoucher.discountValue) <= 0) { setVoucherError('Nhập giá trị giảm'); return; }
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
                        }}
                        disabled={savingConfig}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
                    >
                        {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                        Tạo Voucher
                    </button>
                </div>
            </div>

            {/* Voucher List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-indigo-500" />
                    Danh sách Voucher ({vouchers.length})
                </h3>
                {vouchers.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có voucher nào.</p>
                ) : (
                    <div className="space-y-2">
                        {vouchers.map(v => {
                            const isExpired = v.expiresAt && new Date() > (v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt));
                            const isUsedUp = v.maxUses > 0 && v.usedCount >= v.maxUses;
                            return (
                                <div key={v.id} className={`p-3 rounded-xl border transition-all ${!v.active || isExpired || isUsedUp
                                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                                    : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs ${v.active && !isExpired && !isUsedUp
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                : 'bg-gray-400'
                                                }`}>
                                                {v.discountType === 'percent' ? `${v.discountValue}%` : `${Math.round(v.discountValue / 1000)}K`}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white font-mono text-sm">{v.code}</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-gray-500">
                                                        {v.discountType === 'percent' ? `Giảm ${v.discountValue}%` : `Giảm ${formatVND(v.discountValue)}`}
                                                    </span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-500">
                                                        Đã dùng: {v.usedCount || 0}{v.maxUses > 0 ? `/${v.maxUses}` : '/∞'}
                                                    </span>
                                                    {v.expiresAt && (
                                                        <>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                                                                {isExpired ? 'Hết hạn' : `HSD: ${new Date(v.expiresAt?.toDate ? v.expiresAt.toDate() : v.expiresAt).toLocaleDateString('vi-VN')}`}
                                                            </span>
                                                        </>
                                                    )}
                                                    {v.description && (
                                                        <>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-gray-400 italic">{v.description}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={async () => {
                                                    setSavingConfig(true);
                                                    await toggleVoucher(v.code, !v.active);
                                                    setNotification({ type: 'success', message: v.active ? `Đã tắt voucher ${v.code}` : `Đã bật voucher ${v.code}` });
                                                    setSavingConfig(false);
                                                }}
                                                disabled={savingConfig}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                title={v.active ? 'Tắt voucher' : 'Bật voucher'}
                                            >
                                                {v.active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!await showConfirm(`Xóa voucher ${v.code}?`, { type: 'danger', confirmText: 'Xóa' })) return;
                                                    setSavingConfig(true);
                                                    await deleteVoucher(v.code);
                                                    setNotification({ type: 'success', message: `Đã xóa voucher ${v.code}` });
                                                    setSavingConfig(false);
                                                }}
                                                disabled={savingConfig}
                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Xóa voucher"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
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

export default AdminVouchersSection;
