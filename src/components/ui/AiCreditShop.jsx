import React, { useState, useEffect, useRef } from 'react';
import { Sparkle, Zap, Star, Crown, Gift, Check, CreditCard, CheckCircle, Loader2, QrCode, Copy, Ticket, X, ArrowLeft, ChevronRight, Settings, BookOpen, Languages, Trophy, AlertTriangle, Trash2, Plus } from 'lucide-react'
import { submitCreditRequest, createPendingAutoPayment, DEFAULT_AI_PACKAGES, DEFAULT_SPECIALIZED_PACKAGES, validateVoucher, calculateDiscountedPrice, useVoucher, processPaymentSecurely, submitAndApproveCreditRequest, updateAdminConfig } from '../../utils/adminSettings';
import { generateOrderCode, generateVietQR, checkPaymentStatus, getSepayToken } from '../../utils/sepayPayment';
import { sendAIPurchaseSuccessEmail, sendAIPendingConfirmationEmail } from '../../utils/email';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

const ICONS = {
    premium_1m: Crown,
    premium_1y: Crown,
    premium_3y: Crown,
    premium: Crown,
    starter: Zap,
    popular: Star,
    best_value: Crown,
    ultimate: Gift,
    vocab_zen: BookOpen,
    grammar_zen: Sparkle,
    kanji_zen: Languages,
    jlpt_prep: Trophy
};

const COLORS = {
    premium_1m: 'from-amber-500 to-orange-500',
    premium_1y: 'from-amber-500 to-orange-500',
    premium_3y: 'from-amber-500 to-orange-600',
    premium: 'from-amber-500 to-orange-600',
    starter: 'from-blue-500 to-cyan-500',
    popular: 'from-indigo-500 to-purple-600',
    best_value: 'from-amber-500 to-orange-600',
    ultimate: 'from-rose-500 to-pink-600',
    vocab_zen: 'from-purple-500 to-indigo-600',
    grammar_zen: 'from-teal-400 to-emerald-600',
    kanji_zen: 'from-amber-500 to-orange-500',
    jlpt_prep: 'from-rose-500 to-pink-500'
};

const BG_LIGHT = {
    premium_1m: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    premium_1y: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    premium_3y: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    premium: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    starter: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    popular: 'from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20',
    best_value: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    ultimate: 'from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20',
    vocab_zen: 'from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20',
    grammar_zen: 'from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20',
    kanji_zen: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    jlpt_prep: 'from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20'
};

const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

/**
 * UpgradeScreen - Trang nâng cấp tài khoản
 * Hỗ trợ mua gói thẻ AI và các gói tính năng chuyên sâu Zen
 * Tích hợp chế độ Admin chỉnh sửa trực tiếp cấu hình
 */
const UpgradeScreen = ({ creditsRemaining = 0, adminConfig, userId, userName, userEmail, profile, isAdmin }) => {
    // Step: 'packages' | 'info' | 'payment'
    const [step, setStep] = useState('packages');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [orderCode, setOrderCode] = useState('');
    const [checking, setChecking] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [copied, setCopied] = useState('');
    const pollingRef = useRef(null);
    const countdownRef = useRef(null);

    const clearPolling = () => {
        if (pollingRef.current) {
            if (typeof pollingRef.current === 'function') {
                pollingRef.current();
            } else {
                clearInterval(pollingRef.current);
            }
            pollingRef.current = null;
        }
    };

    // Voucher
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState('');

    // Admin Edit Mode
    const [adminEditMode, setAdminEditMode] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [editedConfig, setEditedConfig] = useState(null);
    const [adminTab, setAdminTab] = useState('specialized'); // 'specialized' | 'general' | 'simulation'

    const packagesReady = adminConfig !== null && adminConfig._fromCache === false;
    const packages = adminConfig?.aiCreditPackages || DEFAULT_AI_PACKAGES;
    const specializedPackages = (adminConfig?.specializedPackages || DEFAULT_SPECIALIZED_PACKAGES).filter(pkg => pkg.id !== 'premium');

    // User's unlocked specialized packages
    const unlockedPackages = profile?.unlockedSpecializedPackages || [];

    const bankId = adminConfig?.bankId || 'MB';
    const bankAccountNo = adminConfig?.bankAccountNo || '';
    const bankAccountName = adminConfig?.bankAccountName || '';

    // Support channels
    const supportChannels = {
        zalo: adminConfig?.supportZalo || '',
        messenger: adminConfig?.supportMessenger || '',
        email: adminConfig?.supportEmail || '',
    };

    // Initialize/sync Admin editing state
    useEffect(() => {
        if (adminConfig) {
            setEditedConfig({
                aiCreditPackages: adminConfig.aiCreditPackages || DEFAULT_AI_PACKAGES,
                specializedPackages: (adminConfig.specializedPackages || DEFAULT_SPECIALIZED_PACKAGES).filter(pkg => pkg.id !== 'premium'),
                bankId: adminConfig.bankId || 'MB',
                bankAccountNo: adminConfig.bankAccountNo || '',
                bankAccountName: adminConfig.bankAccountName || '',
                supportZalo: adminConfig.supportZalo || '',
                supportMessenger: adminConfig.supportMessenger || '',
                supportEmail: adminConfig.supportEmail || '',
                flashSaleEnd: adminConfig.flashSaleEnd || (Date.now() + 2 * 3600 * 1000 + 41 * 60 * 1000), // Default 2h41m
                flashSaleText: adminConfig.flashSaleText || 'FLASH SALE – GIẢM ĐẾN 65%'
            });
        }
    }, [adminConfig]);

    // Timer countdown for Flash Sale
    const [countdownText, setCountdownText] = useState('02:41:00');
    useEffect(() => {
        const updateCountdown = () => {
            const target = adminConfig?.flashSaleEnd || (Date.now() + 2 * 3600 * 1000 + 41 * 60 * 1000);
            const diff = target - Date.now();
            if (diff <= 0) {
                setCountdownText('00:00:00');
                return;
            }
            const h = Math.floor(diff / (3600 * 1000)).toString().padStart(2, '0');
            const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000)).toString().padStart(2, '0');
            const s = Math.floor((diff % (60 * 1000)) / 1000).toString().padStart(2, '0');
            setCountdownText(`${h}:${m}:${s}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [adminConfig?.flashSaleEnd]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            clearPolling();
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    // Countdown state for step 3 payment checkout
    const [paymentCountdown, setPaymentCountdown] = useState(0);

    // Add & Delete Packages functions for Admin
    const addCreditPackage = () => {
        if (!editedConfig) return;
        const newId = 'custom_' + Date.now();
        const newPkg = {
            id: newId,
            name: 'Gói Mới',
            cards: 100,
            originalPrice: 19000,
            salePrice: 19000
        };
        setEditedConfig({
            ...editedConfig,
            aiCreditPackages: [...editedConfig.aiCreditPackages, newPkg]
        });
    };

    const deleteCreditPackage = (idx) => {
        if (!editedConfig) return;
        const updated = editedConfig.aiCreditPackages.filter((_, i) => i !== idx);
        setEditedConfig({
            ...editedConfig,
            aiCreditPackages: updated
        });
    };

    const addSpecializedPackage = () => {
        if (!editedConfig) return;
        const newId = 'specialized_' + Date.now();
        const newPkg = {
            id: newId,
            name: 'Gói Chuyên Sâu Mới',
            description: 'Mô tả ngắn của gói tính năng mới',
            originalPrice: 99000,
            salePrice: 49000,
            unlockedFeatures: [
                'Tính năng mới 1',
                'Tính năng mới 2'
            ]
        };
        setEditedConfig({
            ...editedConfig,
            specializedPackages: [...editedConfig.specializedPackages, newPkg]
        });
    };

    const deleteSpecializedPackage = (idx) => {
        if (!editedConfig) return;
        const updated = editedConfig.specializedPackages.filter((_, i) => i !== idx);
        setEditedConfig({
            ...editedConfig,
            specializedPackages: updated
        });
    };

    // Save Admin Configuration
    const handleSaveAdminConfig = async () => {
        if (!editedConfig) return;
        setSaveLoading(true);
        try {
            const ok = await updateAdminConfig(editedConfig, userId);
            if (ok) {
                alert('Đã lưu cấu hình nâng cấp thành công!');
                setAdminEditMode(false);
            } else {
                alert('Có lỗi xảy ra khi cập nhật cấu hình.');
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi: ' + e.message);
        }
        setSaveLoading(false);
    };

    // Admin function to simulate/toggle unlocked status of specialized package for current user profile
    const handleToggleSimulateUnlock = async (packageId) => {
        if (!profile) return;
        let newList = [...unlockedPackages];
        if (newList.includes(packageId)) {
            newList = newList.filter(id => id !== packageId);
        } else {
            newList.push(packageId);
        }
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
            await updateDoc(profileRef, { unlockedSpecializedPackages: newList });
        } catch (e) {
            console.error('Lỗi mô phỏng mở khóa:', e);
            alert('Lỗi cập nhật profile: ' + e.message);
        }
    };

    const handleUpdateTrialTier = async (tier) => {
        if (!profile) return;
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
            await updateDoc(profileRef, {
                trialPricingTier: tier || null
            });
            alert(`Đã đổi gói giả lập thành công sang: ${tier || 'Thực tế'}`);
        } catch (e) {
            console.error('Lỗi cập nhật trial tier:', e);
            alert('Lỗi cập nhật: ' + e.message);
        }
    };

    // Voucher handling
    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) return;
        setVoucherLoading(true);
        setVoucherError('');
        const result = await validateVoucher(voucherCode, userId);
        if (result.valid) {
            setAppliedVoucher(result.voucher);
        } else {
            setAppliedVoucher(null);
            setVoucherError(result.error);
        }
        setVoucherLoading(false);
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherCode('');
        setVoucherError('');
    };

    const getFinalPrice = (pkg) => {
        if (!appliedVoucher) return pkg.salePrice;
        return calculateDiscountedPrice(pkg.salePrice, appliedVoucher);
    };

    const handleSelectPackage = (pkg) => {
        setSelectedPackage(pkg);
        setStep('info');
    };

    // Proceed to payment
    const handleProceedToPayment = async () => {
        if (!selectedPackage) return;
        clearPolling();
        if (countdownRef.current) clearInterval(countdownRef.current);
        setPaymentSuccess(false);
        setSubmitted(false);
        setChecking(false);

        const code = generateOrderCode(userId);
        setOrderCode(code);
        setStep('payment');

        const finalPrice = getFinalPrice(selectedPackage);

        setChecking(true);
        // Register the pending auto payment request as the foundation for the Webhook to verify
        const ok = await createPendingAutoPayment(code, userId, userName, userEmail, { ...selectedPackage, salePrice: finalPrice });
        if (ok) {
            startWebhookListening(code, selectedPackage, finalPrice);
        } else {
            setChecking(false);
            alert("Có lỗi xảy ra khi tạo đơn hàng thanh toán tự động. Vui lòng thử lại!");
        }
    };

    const startWebhookListening = (code, pkg, finalPrice) => {
        setChecking(true);
        setPaymentCountdown(600); // 10 minutes

        const docRef = doc(db, `artifacts/${appId}/creditRequests`, code);
        
        // Listen to the specific creditRequest document whose ID matches the orderCode
        const unsubscribe = onSnapshot(docRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.status === 'approved') {
                    clearPolling();
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    setChecking(false);
                    setPaymentSuccess(true);

                    if (appliedVoucher) {
                        try { await useVoucher(appliedVoucher.code, userId); } catch (e) { console.warn(e); }
                    }
                    
                    try {
                        const packageDisplayName = pkg.cards !== undefined 
                            ? `Gói ${pkg.name} (${pkg.cards.toLocaleString()} thẻ AI)`
                            : `Gói tính năng ${pkg.name}`;
                        await sendAIPurchaseSuccessEmail(userEmail, userName, packageDisplayName, finalPrice, pkg.cards || 0);
                    } catch (e) {
                        console.warn('Failed to send success email:', e);
                    }
                }
            }
        }, (error) => {
            console.error("Error listening to payment status:", error);
        });

        pollingRef.current = unsubscribe;

        countdownRef.current = setInterval(() => {
            setPaymentCountdown(prev => {
                if (prev <= 1) { 
                    clearPolling();
                    clearInterval(countdownRef.current); 
                    setChecking(false); 
                    return 0; 
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleManualConfirm = async () => {
        if (!selectedPackage) return;
        const manualFinalPrice = getFinalPrice(selectedPackage);
        const ok = await submitCreditRequest(userId, userName, userEmail, { ...selectedPackage, cards: selectedPackage.cards ?? null, salePrice: manualFinalPrice });
        if (ok) {
            if (appliedVoucher) { try { await useVoucher(appliedVoucher.code, userId); } catch (e) { console.warn(e); } }
            if (userEmail) {
                try {
                    const packageDisplayName = selectedPackage.cards !== undefined 
                        ? `Gói ${selectedPackage.name} (${selectedPackage.cards.toLocaleString()} thẻ AI)`
                        : `Gói tính năng ${selectedPackage.name}`;
                    await sendAIPendingConfirmationEmail(userEmail, userName, packageDisplayName, manualFinalPrice);
                    console.log('✅ Email chờ duyệt đã gửi tới:', userEmail);
                } catch (e) {
                    console.warn('⚠️ Gửi email báo cáo giao dịch thất bại:', e);
                }
            }
            setSubmitted(true);
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    };

    const finalPrice = selectedPackage ? getFinalPrice(selectedPackage) : 0;
    const discountAmount = selectedPackage && appliedVoucher ? selectedPackage.salePrice - finalPrice : 0;
    const qrUrl = selectedPackage ? generateVietQR(bankId, bankAccountNo, bankAccountName, finalPrice, orderCode) : '';

    // ==================== ADMIN EDITING PANEL ====================
    const renderAdminEditor = () => {
        if (!adminEditMode || !editedConfig) return null;
        return (
            <div className="bg-white dark:bg-slate-800 border-2 border-indigo-400 rounded-3xl p-6 mb-8 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600 animate-spin" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bảng Quản Trị Cấu Hình Trực Tiếp</h2>
                    </div>
                    <button 
                        onClick={() => setAdminEditMode(false)}
                        className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-slate-700 mb-6 gap-2">
                    {[
                        { id: 'specialized', label: 'Quản lý Gói Premium' },
                        { id: 'general', label: 'Cấu hình Chung & SePay' },
                        { id: 'simulation', label: 'Thử Nghiệm Mở Khóa' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setAdminTab(tab.id)}
                            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                                adminTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:text-indigo-400' 
                                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Quản lý Gói Premium */}
                {adminTab === 'specialized' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {editedConfig.specializedPackages.map((pkg, idx) => (
                                <div key={pkg.id || idx} className="relative border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-gray-50/50 dark:bg-slate-900/30">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-150/40 dark:border-slate-800">
                                        <p className="text-xs font-bold text-purple-650 uppercase">Gói: {pkg.name}</p>
                                        <button
                                            type="button"
                                            onClick={() => deleteSpecializedPackage(idx)}
                                            className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 transition-colors"
                                            title="Xóa gói"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500">Mã gói (ID)</label>
                                            <input
                                                type="text"
                                                value={pkg.id}
                                                onChange={(e) => {
                                                    const updated = [...editedConfig.specializedPackages];
                                                    updated[idx].id = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                                    setEditedConfig({ ...editedConfig, specializedPackages: updated });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500">Tên gói</label>
                                            <input
                                                type="text"
                                                value={pkg.name}
                                                onChange={(e) => {
                                                    const updated = [...editedConfig.specializedPackages];
                                                    updated[idx].name = e.target.value;
                                                    setEditedConfig({ ...editedConfig, specializedPackages: updated });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500">Mô tả ngắn</label>
                                            <input
                                                type="text"
                                                value={pkg.description}
                                                onChange={(e) => {
                                                    const updated = [...editedConfig.specializedPackages];
                                                    updated[idx].description = e.target.value;
                                                    setEditedConfig({ ...editedConfig, specializedPackages: updated });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500">Giá gốc (VND)</label>
                                            <input
                                                type="number"
                                                value={pkg.originalPrice}
                                                onChange={(e) => {
                                                    const updated = [...editedConfig.specializedPackages];
                                                    updated[idx].originalPrice = Number(e.target.value);
                                                    setEditedConfig({ ...editedConfig, specializedPackages: updated });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500">Giá Sale (VND)</label>
                                            <input
                                                type="number"
                                                value={pkg.salePrice}
                                                onChange={(e) => {
                                                    const updated = [...editedConfig.specializedPackages];
                                                    updated[idx].salePrice = Number(e.target.value);
                                                    setEditedConfig({ ...editedConfig, specializedPackages: updated });
                                                }}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500">Danh sách tính năng mở khóa (mỗi dòng 1 tính năng)</label>
                                        <textarea
                                            value={pkg.unlockedFeatures?.join('\n') || ''}
                                            onChange={(e) => {
                                                const updated = [...editedConfig.specializedPackages];
                                                updated[idx].unlockedFeatures = e.target.value.split('\n').filter(Boolean);
                                                setEditedConfig({ ...editedConfig, specializedPackages: updated });
                                            }}
                                            rows={3}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-white font-mono"
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Add button block */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={addSpecializedPackage}
                                    className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 rounded-2xl bg-gray-50/20 dark:bg-slate-900/10 hover:bg-purple-50/10 transition-all group gap-2"
                                >
                                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400">Thêm gói tính năng chuyên sâu mới</span>
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (await window.showConfirm("Bạn có chắc chắn muốn nhập 2 gói Premium mặc định (1 năm & 3 năm)? Thao tác này sẽ ghi đè danh sách đang hiển thị.", { type: 'warning' })) {
                                            setEditedConfig({
                                                ...editedConfig,
                                                specializedPackages: [...DEFAULT_SPECIALIZED_PACKAGES]
                                            });
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 rounded-2xl bg-indigo-50/10 hover:bg-indigo-50/20 transition-all group gap-2"
                                >
                                    <Crown className="w-5 h-5 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                                    <span className="text-xs font-bold text-indigo-500 group-hover:text-indigo-600">Nhập 2 gói Premium mặc định</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Chung & SePay */}
                {adminTab === 'general' && (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Thông tin tài khoản nhận chuyển khoản</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Mã ngân hàng (VietQR)</label>
                                <input
                                    type="text"
                                    value={editedConfig.bankId}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, bankId: e.target.value })}
                                    placeholder="MB, VCB, TCB,..."
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Số tài khoản ngân hàng</label>
                                <input
                                    type="text"
                                    value={editedConfig.bankAccountNo}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, bankAccountNo: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Tên chủ tài khoản</label>
                                <input
                                    type="text"
                                    value={editedConfig.bankAccountName}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, bankAccountName: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">Thông tin liên hệ & hỗ trợ</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Link liên hệ Zalo</label>
                                <input
                                    type="text"
                                    value={editedConfig.supportZalo}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, supportZalo: e.target.value })}
                                    placeholder="https://zalo.me/..."
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Link Facebook Messenger</label>
                                <input
                                    type="text"
                                    value={editedConfig.supportMessenger}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, supportMessenger: e.target.value })}
                                    placeholder="https://m.me/..."
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Email hỗ trợ</label>
                                <input
                                    type="email"
                                    value={editedConfig.supportEmail}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, supportEmail: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">Banner Flash Sale</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Nội dung text flash sale</label>
                                <input
                                    type="text"
                                    value={editedConfig.flashSaleText}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, flashSaleText: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 dark:text-slate-400">Đặt lại thời lượng kết thúc (Phút kể từ bây giờ)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        defaultValue={161}
                                        id="flashSaleDurationInput"
                                        className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const mins = Number(document.getElementById('flashSaleDurationInput')?.value) || 161;
                                            const targetTime = Date.now() + mins * 60 * 1000;
                                            setEditedConfig({ ...editedConfig, flashSaleEnd: targetTime });
                                            alert(`Đã đặt thời hạn flash sale mới: ${mins} phút nữa.`);
                                        }}
                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold rounded-xl"
                                    >
                                        Cập nhật
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Thử Nghiệm Mở Khóa */}
                {adminTab === 'simulation' && (
                    <div className="space-y-6">
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                            <div>
                                <p className="font-bold mb-1">CHẾ ĐỘ GIẢ LẬP GÓI CƯỚC (DÀNH CHO ADMIN):</p>
                                <p>Admin có thể tự chuyển đổi tài khoản của mình sang các gói cước khác nhau để kiểm tra giới hạn tạo học phần (tối đa 3), từ vựng (tối đa 20/học phần) và lượt AI tương ứng. Các tài khoản người dùng khác hoàn toàn không bị ảnh hưởng.</p>
                            </div>
                        </div>

                        {/* Phần 1: Giả lập gói cước chính */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/30">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-1.5 font-bold">
                                <Crown className="w-4 h-4 text-indigo-500" />
                                1. Giả lập Gói cước chính
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block mb-2">Chọn gói cước muốn test</label>
                                    <select
                                        value={profile?.trialPricingTier || ''}
                                        onChange={(e) => handleUpdateTrialTier(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Không giả lập (Dùng gói thực tế)</option>
                                        <option value="free" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Gói MIỄN PHÍ (Giới hạn 3 học phần, tối đa 20 từ/học phần)</option>
                                        <option value="premium_1m" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Gói Premium 1 Tháng (Mở khóa toàn bộ tính năng, không giới hạn AI)</option>
                                        <option value="premium_1y" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Gói Premium 1 Năm (Mở khóa toàn bộ tính năng, không giới hạn AI)</option>
                                        <option value="premium_3y" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Gói Premium 3 Năm (Mở khóa toàn bộ tính năng, không giới hạn AI)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Phần 2: Giả lập các gói chuyên sâu Zen */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/30">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-1.5 font-bold">
                                <Sparkle className="w-4 h-4 text-purple-500" />
                                2. Mở khóa Gói tính năng chuyên sâu Zen
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {specializedPackages.map(pkg => {
                                    const isUnlocked = unlockedPackages.includes(pkg.id);
                                    return (
                                        <div 
                                            key={pkg.id} 
                                            onClick={() => handleToggleSimulateUnlock(pkg.id)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                                isUnlocked 
                                                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10' 
                                                    : 'border-gray-200 dark:border-slate-700 bg-slate-50/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold">
                                                    {isUnlocked ? '✓' : '🔒'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-xs text-gray-900 dark:text-white">{pkg.name}</p>
                                                    <p className="text-[10px] text-gray-500">ID: {pkg.id}</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={isUnlocked} 
                                                onChange={() => {}} // handled by div click
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Changes button */}
                <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700 pt-4">
                    <button
                        onClick={() => setAdminEditMode(false)}
                        className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-150 rounded-xl"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSaveAdminConfig}
                        disabled={saveLoading}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-100"
                    >
                        {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Lưu Cấu Hình
                    </button>
                </div>
            </div>
        );
    };

    // ==================== STEP 1: PACKAGES VIEW ====================
    if (step === 'packages') {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8 select-none">
                {/* Header Section */}
                <div className="relative mb-6 text-center">
                    {/* Admin config edit trigger */}
                    {isAdmin && (
                        <div className="absolute top-0 right-0 z-10">
                            <button
                                onClick={() => setAdminEditMode(!adminEditMode)}
                                className={`px-4 py-2 text-xs font-bold rounded-full shadow-lg border transition-all flex items-center gap-1.5 ${
                                    adminEditMode 
                                        ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' 
                                        : 'bg-white hover:bg-gray-50 border-indigo-200 text-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Settings className={`w-4 h-4 ${adminEditMode ? 'animate-spin' : ''}`} />
                                {adminEditMode ? 'Đóng Bảng Sửa' : 'Cấu Hình Trực Tiếp'}
                            </button>
                        </div>
                    )}

                    <div className="inline-flex items-center gap-2 bg-[#EEF2FF] dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-xs font-extrabold mb-3 tracking-wider uppercase">
                        👑 Nâng cấp tài khoản
                    </div>

                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                        Mở khóa tài khoản Premium Quizki
                    </h1>

                    <p className="max-w-2xl mx-auto text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                        Sử dụng không giới hạn tất cả các tính năng thông minh của ứng dụng bao gồm tạo từ vựng bằng AI, luyện đề JLPT, và các phương pháp học tập chuyên sâu Zen.
                    </p>
                </div>

                {/* Admin Live Config Form */}
                {renderAdminEditor()}

                {/* Flash Sale Countdown Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl py-3 px-6 text-white text-center mb-8 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-3">
                    <span className="animate-bounce">🔥</span>
                    <span className="font-extrabold text-sm uppercase tracking-wider">
                        {adminConfig?.flashSaleText || 'FLASH SALE – GIẢM ĐẾN 65%'}
                    </span>
                    <div className="bg-black/25 text-white font-mono px-3 py-1 rounded-lg text-sm font-black shadow-inner flex items-center gap-1">
                        <span>{countdownText}</span>
                    </div>
                </div>

                {/* Packages Grid */}
                {!packagesReady ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12 items-stretch">
                        {[1, 2].map(i => (
                            <div key={i} className="rounded-3xl border border-gray-100 dark:border-slate-800 p-8 animate-pulse bg-white dark:bg-slate-900 shadow-sm min-h-[380px]">
                                <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-slate-800 mb-4" />
                                <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-2/3 mb-3" />
                                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mb-4" />
                                <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded w-full mb-6" />
                                <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded w-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12 items-stretch">
                        {specializedPackages.map(pkg => {
                            const isUnlocked = unlockedPackages.includes(pkg.id);
                            const Icon = ICONS[pkg.id] || Crown;
                            const color = COLORS[pkg.id] || 'from-amber-500 to-orange-650';
                            const bgLight = BG_LIGHT[pkg.id] || 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20';
                            const is3Y = pkg.id === 'premium_3y';

                            return (
                                <div
                                    key={pkg.id}
                                    onClick={() => {
                                        if (!isUnlocked) {
                                            handleSelectPackage(pkg);
                                        }
                                    }}
                                    className={`relative bg-gradient-to-br ${bgLight} rounded-3xl border-2 p-8 flex flex-col justify-between transition-all duration-300 shadow-xl overflow-hidden ${
                                        isUnlocked 
                                            ? 'border-emerald-400 dark:border-emerald-500 opacity-95 cursor-default' 
                                            : `border-amber-400 dark:border-amber-550 hover:border-amber-505 dark:hover:border-amber-400 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ring-4 ring-amber-400/5 ${is3Y ? 'scale-[1.01] border-amber-500 dark:border-amber-400 shadow-amber-500/5 ring-8 ring-amber-500/5' : ''}`
                                    }`}
                                >
                                    {/* Golden Ribbon Badge */}
                                    {is3Y && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-600 to-orange-500 text-white text-[9px] font-black tracking-wider px-5 py-1.5 rounded-bl-3xl shadow-md uppercase">
                                            ★ TIẾT KIỆM NHẤT
                                        </div>
                                    )}
                                    {!is3Y && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-slate-600 to-slate-500 dark:from-slate-800 dark:to-slate-700 text-white text-[9px] font-bold tracking-wider px-5 py-1.5 rounded-bl-3xl shadow-sm uppercase">
                                            Phổ biến
                                        </div>
                                    )}

                                    {isUnlocked && (
                                        <div className="absolute top-4 left-4 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                                            Đã sở hữu <Check className="w-3.5 h-3.5" />
                                        </div>
                                    )}

                                    <div>
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20`}>
                                            <Icon className="w-8 h-8 text-white fill-white/10" />
                                        </div>
                                        <h3 className="font-black text-gray-900 dark:text-white text-xl mb-1 flex items-center gap-2">
                                            {pkg.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed font-bold">
                                            {pkg.description}
                                        </p>

                                        {/* Unlocked Features list */}
                                        <div className="border-t border-amber-200/40 dark:border-slate-700/50 pt-5 mt-2 space-y-3 mb-8">
                                            <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Quyền lợi Premium:</p>
                                            {pkg.unlockedFeatures?.map((feature, fIdx) => {
                                                const cleanFeature = feature.replace('[Premium]', '').trim();
                                                return (
                                                    <div key={fIdx} className="flex gap-2.5 items-start">
                                                        <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200 dark:border-amber-900">
                                                            <Check className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                                        </div>
                                                        <span className="text-xs leading-relaxed text-gray-700 dark:text-slate-350 font-semibold">
                                                            {cleanFeature}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-amber-250/20 dark:border-slate-800">
                                        {!isUnlocked ? (
                                            <>
                                                <div className="flex items-baseline gap-2 mb-3">
                                                    <span className="text-gray-900 dark:text-white font-black text-2xl">
                                                        {formatVND(pkg.salePrice)}
                                                    </span>
                                                    {pkg.originalPrice && pkg.originalPrice > pkg.salePrice && (
                                                        <span className="text-gray-400 dark:text-slate-500 line-through text-xs font-bold">
                                                            {formatVND(pkg.originalPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`w-full py-3 rounded-2xl text-white font-bold text-sm bg-gradient-to-r ${color} flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity`}>
                                                    Đăng ký ngay <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full py-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-black text-sm flex items-center justify-center gap-1.5">
                                                Đã kích hoạt ✓
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ==================== STEP 2: PACKAGE INFO + VOUCHER ====================
    if (step === 'info' && selectedPackage) {
        const color = COLORS[selectedPackage.id] || COLORS.starter;
        const Icon = ICONS[selectedPackage.id] || Zap;
        const isSpecialized = selectedPackage.cards === undefined;

        return (
            <div className="max-w-2xl mx-auto px-4 py-8 select-none">
                {/* Back Link */}
                <button 
                    onClick={() => { 
                        setStep('packages'); 
                        setAppliedVoucher(null); 
                        setVoucherCode(''); 
                        setVoucherError(''); 
                    }} 
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-455 hover:text-indigo-500 mb-6 transition-colors font-bold"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại chọn gói
                </button>

                {/* Layout Container */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-xl">
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${color} px-6 py-6 text-white`}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Icon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl leading-tight">Cấu hình thanh toán</h2>
                                <p className="text-white/80 text-xs mt-0.5">
                                    Mở khóa gói: {selectedPackage.name}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info rows */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800">
                            <span className="text-xs text-gray-500">Tên gói</span>
                            <span className="text-sm font-extrabold text-gray-800 dark:text-white">{selectedPackage.name}</span>
                        </div>
                        {selectedPackage.cards && (
                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800">
                                <span className="text-xs text-gray-500">Số lượng Credit</span>
                                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{selectedPackage.cards.toLocaleString()} credit</span>
                            </div>
                        )}
                        {selectedPackage.originalPrice && selectedPackage.originalPrice > selectedPackage.salePrice && (
                            <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800">
                                <span className="text-xs text-gray-500">Giá gốc</span>
                                <span className="text-sm text-gray-400 line-through">{formatVND(selectedPackage.originalPrice)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800">
                            <span className="text-xs text-gray-500">Đơn giá bán</span>
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                {formatVND(selectedPackage.salePrice)}
                            </span>
                        </div>

                        {/* Voucher Coupon Section */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-gray-150/40 dark:border-slate-800">
                            <p className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-2.5 flex items-center gap-1">
                                <Ticket className="w-4 h-4 text-indigo-500" /> Nhập mã giảm giá (Voucher)
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={voucherCode}
                                    onChange={(e) => { 
                                        setVoucherCode(e.target.value.toUpperCase()); 
                                        setVoucherError(''); 
                                    }}
                                    placeholder="GIAM65, QUYZKIMAY,..."
                                    disabled={!!appliedVoucher}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-xs font-mono uppercase dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                {appliedVoucher ? (
                                    <button 
                                        onClick={handleRemoveVoucher} 
                                        className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 flex items-center gap-1 border border-red-200"
                                    >
                                        <X className="w-3.5 h-3.5" /> Hủy
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleApplyVoucher} 
                                        disabled={voucherLoading || !voucherCode.trim()} 
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        {voucherLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                        Áp dụng
                                    </button>
                                )}
                            </div>
                            {voucherError && <p className="mt-2 text-xs text-red-500 font-semibold">{voucherError}</p>}
                            {appliedVoucher && (
                                <div className="mt-2.5 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 py-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                        Áp dụng thành công voucher: <strong>{appliedVoucher.code}</strong> (Giảm {appliedVoucher.discountType === 'percent' ? `${appliedVoucher.discountValue}%` : formatVND(appliedVoucher.discountValue)})
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Discount row */}
                        {appliedVoucher && discountAmount > 0 && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800">
                                <span className="text-xs text-gray-500">Voucher giảm giá</span>
                                <span className="text-sm font-extrabold text-red-500">-{formatVND(discountAmount)}</span>
                            </div>
                        )}

                        {/* Total Payment */}
                        <div className="flex items-center justify-between py-4 mt-2 border-t border-dashed border-gray-200 dark:border-slate-800">
                            <span className="text-sm font-black text-gray-800 dark:text-white">Tổng cộng thanh toán</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatVND(finalPrice)}</span>
                        </div>
                    </div>
                </div>

                {/* Continue button */}
                <button
                    onClick={handleProceedToPayment}
                    className={`w-full mt-6 py-4 rounded-3xl text-white font-bold text-sm bg-gradient-to-r ${color} flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:-translate-y-0.5 transition-all`}
                >
                    Tiếp tục thanh toán <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // ==================== STEP 3: PAYMENT SCREEN ====================
    if (step === 'payment' && selectedPackage) {
        if (paymentSuccess) {
            return (
                <div className="max-w-lg mx-auto px-4 py-16 text-center select-none">
                    <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-2">Thanh toán thành công! 🎉</h2>
                    <p className="text-sm text-gray-600 dark:text-slate-350 mb-4 leading-relaxed">
                        <span>Đã kích hoạt thành công gói Premium <strong>{selectedPackage.name}</strong>.</span>
                    </p>
                    {appliedVoucher && (
                        <p className="text-xs text-emerald-500 mb-6 bg-emerald-50 dark:bg-emerald-950/20 py-1.5 px-4 rounded-xl inline-block font-semibold">
                            🎟️ Voucher đã áp dụng: <strong>{appliedVoucher.code}</strong>
                        </p>
                    )}
                    <button 
                        onClick={() => { 
                            setStep('packages'); 
                            setSelectedPackage(null); 
                            setPaymentSuccess(false); 
                        }} 
                        className="w-full px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/10"
                    >
                        Bắt đầu khám phá ngay! ✨
                    </button>
                </div>
            );
        }

        if (submitted) {
            return (
                <div className="max-w-lg mx-auto px-4 py-16 text-center select-none">
                    <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-indigo-500 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Đã nhận yêu cầu kích hoạt!</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        Yêu cầu kích hoạt gói <strong>{selectedPackage.name}</strong> đã được ghi nhận vào hệ thống. Chúng tôi sẽ duyệt thủ công trong vòng 5-15 phút.
                    </p>
                    <button 
                        onClick={() => { 
                            setStep('packages'); 
                            setSelectedPackage(null); 
                            setSubmitted(false); 
                        }} 
                        className="w-full px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/10"
                    >
                        Quay lại trang chủ
                    </button>
                </div>
            );
        }

        const color = COLORS[selectedPackage.id] || COLORS.starter;
        const Icon = ICONS[selectedPackage.id] || Zap;
        const isSpecialized = selectedPackage.cards === undefined;

        return (
            <div className="max-w-2xl mx-auto px-4 py-8 select-none">
                {/* Back Button */}
                <button 
                    onClick={() => { 
                        setStep('info'); 
                        clearPolling(); 
                        if (countdownRef.current) clearInterval(countdownRef.current); 
                        setChecking(false); 
                    }} 
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-455 hover:text-indigo-500 mb-6 transition-colors font-bold"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại xem cấu hình
                </button>

                {/* Bill Summary */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 mb-6 shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md shadow-indigo-500/5`}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-gray-800 dark:text-white text-base leading-snug">Gói {selectedPackage.name}</h3>
                                <p className="text-xs text-gray-500">
                                    Mở khóa toàn bộ tính năng cao cấp Premium
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            {appliedVoucher && discountAmount > 0 && (
                                <p className="text-xs text-gray-400 line-through mb-0.5">{formatVND(selectedPackage.salePrice)}</p>
                            )}
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatVND(finalPrice)}</p>
                            {appliedVoucher && <p className="text-[10px] text-emerald-500 font-bold">🎟️ Voucher: {appliedVoucher.code}</p>}
                        </div>
                    </div>
                </div>

                {/* QR Code and Bank Details */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 mb-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Left Column: QR */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide mb-3.5">
                            <QrCode className="w-4 h-4" /> Quét QR bằng App Ngân Hàng
                        </div>
                        <div className="relative p-3 bg-white border border-gray-200 rounded-3xl shadow-inner">
                            <img 
                                src={qrUrl} 
                                alt="VietQR VietNam" 
                                className="w-56 h-56 object-contain rounded-2xl" 
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                        </div>
                    </div>

                    {/* Right Column: Bank Details details */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-slate-800 pb-2">
                            Chi tiết chuyển khoản
                        </h4>
                        <div className="bg-[#FFFBEB] dark:bg-amber-950/10 border border-[#FEF3C7] dark:border-amber-900/50 rounded-2xl p-4 space-y-3 shadow-inner">
                            {[
                                { label: 'Tên Ngân hàng', value: bankId, key: null },
                                { label: 'Số tài khoản', value: bankAccountNo, key: 'stk' },
                                { label: 'Chủ tài khoản', value: bankAccountName, key: null },
                                { label: 'Số tiền chuyển', value: formatVND(finalPrice), key: 'amount', rawValue: String(finalPrice), highlight: true },
                                { label: 'Nội dung (Bắt buộc)', value: orderCode, key: 'nd', highlight: true },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-amber-700 dark:text-amber-400">{row.label}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`font-black ${row.highlight ? 'text-indigo-600 dark:text-indigo-400 text-sm' : 'text-amber-900 dark:text-slate-200'}`}>
                                            {row.value}
                                        </span>
                                        {row.key && (
                                            <button 
                                                onClick={() => copyToClipboard(row.rawValue || row.value, row.key)} 
                                                className="text-indigo-500 hover:text-indigo-700 p-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm"
                                            >
                                                {copied === row.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Auto check loading status */}
                {checking && (
                    <div className="bg-[#EEF2FF] dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900 rounded-2xl p-4 text-center mb-6 shadow-inner">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                Đang tự động kiểm tra giao dịch...
                            </span>
                        </div>
                        <p className="text-[11px] text-indigo-500 font-semibold">
                            Hệ thống sẽ hoàn tất và cộng gói ngay lập tức khi nhận được thông báo biến động số dư ({Math.floor(paymentCountdown / 60)}:{(paymentCountdown % 60).toString().padStart(2, '0')})
                        </p>
                    </div>
                )}

                {/* Manual action triggers */}
                <div className="flex gap-4">
                    {!checking && (
                        <button 
                            onClick={handleManualConfirm} 
                            className="w-full py-3.5 rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/10 hover:-translate-y-0.5 transition-all"
                        >
                            Tôi đã chuyển khoản thành công ✓
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default UpgradeScreen;
