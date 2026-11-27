import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X, ShieldAlert, Loader2, CheckCircle2, Zap } from 'lucide-react';
import { resetPremiumUsersAiCredits } from '../../utils/resetUserAiCredits';

const AdminCreditResetModal = ({
    isOpen,
    onClose,
    adminModerators = [],
    onCompleted
}) => {
    const [target1y, setTarget1y] = useState(800);
    const [target3y, setTarget3y] = useState(3000);
    const [anomalyThreshold, setAnomalyThreshold] = useState(5000);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleRunReset = async () => {
        setRunning(true);
        setError('');
        setResult(null);
        try {
            const res = await resetPremiumUsersAiCredits({
                target1y: Math.max(0, Math.floor(Number(target1y) || 0)),
                target3y: Math.max(0, Math.floor(Number(target3y) || 0)),
                anomalyThreshold: Math.max(100, Math.floor(Number(anomalyThreshold) || 5000)),
                adminModerators
            });
            setResult(res);
            if (onCompleted) {
                onCompleted(res);
            }
        } catch (err) {
            setError(err?.message || 'Có lỗi xảy ra khi reset Credit AI.');
        } finally {
            setRunning(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-2 border-b-[6px] border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/60">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500 border-b-4 border-sky-700 text-white flex items-center justify-center shrink-0">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base text-slate-900 dark:text-white">
                                Reset Credit AI Toàn Hệ Thống
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Đưa tài khoản Premium 1 Năm / 3 Năm & tài khoản cheat về đúng chuẩn
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={running}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800/70 flex gap-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-black uppercase tracking-wider mb-0.5">Chuẩn hóa trước khi triển khai</p>
                            <p>
                                Hàm sẽ quét toàn bộ hồ sơ Firestore (bỏ qua Admin & QTV), đặt lại Credit AI cho người dùng <strong>Premium 1 Năm</strong>, <strong>Premium 3 Năm</strong> và xóa bỏ mọi số dư bất thường / giả mạo ở cả <code>settings/profile</code> lẫn <code>userStats</code>.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                                Premium 1 Năm
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={target1y}
                                onChange={(e) => setTarget1y(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-sm font-black text-sky-600 dark:text-sky-400 outline-none"
                            />
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                                Premium 3 Năm
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={target3y}
                                onChange={(e) => setTarget3y(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none"
                            />
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                                Ngưỡng lọc Cheat
                            </label>
                            <input
                                type="number"
                                min={100}
                                value={anomalyThreshold}
                                onChange={(e) => setAnomalyThreshold(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-sm font-black text-rose-600 dark:text-rose-400 outline-none"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-300">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Hoàn tất đồng bộ ({result.scanned} hồ sơ)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                                    <p className="text-base font-black text-sky-600 dark:text-sky-400">{result.reset1yCount}</p>
                                    <p className="text-[10px] font-bold text-slate-500">Reset 1 Năm</p>
                                </div>
                                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{result.reset3yCount}</p>
                                    <p className="text-[10px] font-bold text-slate-500">Reset 3 Năm</p>
                                </div>
                                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                                    <p className="text-base font-black text-rose-600 dark:text-rose-400">{result.anomalyClearedCount}</p>
                                    <p className="text-[10px] font-bold text-slate-500">Xử lý Cheat</p>
                                </div>
                            </div>

                            {result.updatedUsers?.length > 0 && (
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-[11px]">
                                    {result.updatedUsers.slice(0, 30).map((u, idx) => (
                                        <div key={u.uid || idx} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{u.email}</span>
                                            <span className="font-mono font-bold text-slate-500 shrink-0">
                                                {Number(u.before).toLocaleString()} → <strong className="text-emerald-600">{Number(u.after).toLocaleString()}</strong>
                                            </span>
                                        </div>
                                    ))}
                                    {result.updatedUsers.length > 30 && (
                                        <p className="text-center text-slate-400 italic pt-1">
                                            ...và {result.updatedUsers.length - 30} tài khoản khác
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/70 dark:bg-slate-950/60">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={running}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                        {result ? 'Đóng' : 'Hủy'}
                    </button>
                    <button
                        type="button"
                        onClick={handleRunReset}
                        disabled={running}
                        className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-amber-300 text-amber-200" />}
                        <span>{running ? 'Đang xử lý...' : 'Thực thi Reset ngay'}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AdminCreditResetModal;
