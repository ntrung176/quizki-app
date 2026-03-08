import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap, Star, Crown, Gift, Check, ShoppingCart, CreditCard, CheckCircle, Loader2, QrCode, Copy, Ticket, X, ArrowLeft, ChevronRight, MessageCircle, Phone, Mail, ExternalLink } from 'lucide-react';
import { submitCreditRequest, DEFAULT_AI_PACKAGES, validateVoucher, calculateDiscountedPrice, useVoucher, processPaymentSecurely } from '../../utils/adminSettings';
import { generateOrderCode, generateVietQR, checkPaymentStatus, getSepayToken } from '../../utils/sepayPayment';
import { sendAIPurchaseSuccessEmail } from '../../utils/email';

const ICONS = { starter: Zap, popular: Star, best_value: Crown, ultimate: Gift };
const COLORS = {
    starter: 'from-blue-500 to-cyan-500',
    popular: 'from-indigo-500 to-purple-600',
    best_value: 'from-amber-500 to-orange-600',
    ultimate: 'from-rose-500 to-pink-600'
};
const BG_LIGHT = {
    starter: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
    popular: 'from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30',
    best_value: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
    ultimate: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30'
};

const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

/**
 * UpgradeScreen - Trang nâng cấp (full page, không phải modal)
 * 3 bước: Chọn gói → Xem thông tin + Voucher → QR thanh toán
 */
const UpgradeScreen = ({ creditsRemaining = 0, adminConfig, userId, userName, userEmail }) => {
    // Step: 'packages' | 'info' | 'payment'
    const [step, setStep] = useState('packages');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [orderCode, setOrderCode] = useState('');
    const [checking, setChecking] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [copied, setCopied] = useState('');
    const pollingRef = useRef(null);
    const countdownRef = useRef(null);

    // Voucher
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState('');

    const packages = adminConfig?.aiCreditPackages || DEFAULT_AI_PACKAGES;
    const bankId = adminConfig?.bankId || 'MB';
    const bankAccountNo = adminConfig?.bankAccountNo || '';
    const bankAccountName = adminConfig?.bankAccountName || '';

    // Support channels (admin cấu hình)
    const supportChannels = {
        zalo: adminConfig?.supportZalo || '',
        messenger: adminConfig?.supportMessenger || '',
        email: adminConfig?.supportEmail || '',
    };

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    // Voucher handlers
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

    // Select package → go to info step
    const handleSelectPackage = (pkg) => {
        setSelectedPackage(pkg);
        setStep('info');
    };

    // Proceed to payment
    const handleProceedToPayment = () => {
        if (!selectedPackage) return;
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        setPaymentSuccess(false);
        setSubmitted(false);
        setChecking(false);

        const code = generateOrderCode(userId);
        setOrderCode(code);
        setStep('payment');

        const token = getSepayToken(adminConfig);
        const finalPrice = getFinalPrice(selectedPackage);
        if (token) {
            setChecking(true);
            setCountdown(600); // 10 phút
            startPolling(code, selectedPackage, token, finalPrice);
        }
    };

    const startPolling = (code, pkg, token, finalPrice) => {
        const pollingStartTime = new Date(); // Ghi lại thời điểm bắt đầu phiên thanh toán này
        pollingRef.current = setInterval(async () => {
            const result = await checkPaymentStatus(token, code, finalPrice, pollingStartTime);
            if (result && result.success) {
                clearInterval(pollingRef.current);
                clearInterval(countdownRef.current);
                setChecking(false);

                // SECURITY: Use atomic transaction to prevent replay attacks
                const txId = result.transactionId || result.referenceNumber;
                if (!txId) {
                    console.error('❌ No transaction ID found in payment result');
                    return;
                }

                const secureResult = await processPaymentSecurely(
                    txId, code, userId, pkg.cards, finalPrice
                );

                if (secureResult.success) {
                    setPaymentSuccess(true);
                    try { await submitCreditRequest(userId, userName, userEmail, { ...pkg }); } catch (e) { console.warn(e); }
                    if (appliedVoucher) {
                        try { await useVoucher(appliedVoucher.code, userId); } catch (e) { console.warn(e); }
                    }
                    try {
                        // Send success email
                        await sendAIPurchaseSuccessEmail(userEmail, userName, pkg.name, finalPrice, pkg.cards);
                    } catch (e) {
                        console.warn('Failed to send success email:', e);
                    }
                } else {
                    console.warn('⚠️ Payment already processed or failed:', secureResult.error);
                    // Still show success if duplicate (user already got credits)
                    if (secureResult.error?.includes('đã được xử lý')) {
                        setPaymentSuccess(true);
                    }
                }
            }
        }, 3000); // Poll mỗi 3 giây (trước: 5 giây)
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(pollingRef.current); clearInterval(countdownRef.current); setChecking(false); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleManualConfirm = async () => {
        if (!selectedPackage) return;
        const ok = await submitCreditRequest(userId, userName, userEmail, selectedPackage);
        if (ok) {
            if (appliedVoucher) { try { await useVoucher(appliedVoucher.code, userId); } catch (e) { console.warn(e); } }
            // Gửi email xác nhận yêu cầu thủ công
            if (userEmail) {
                try {
                    const finalPrice = getFinalPrice(selectedPackage);
                    await sendAIPurchaseSuccessEmail(userEmail, userName, selectedPackage.name, finalPrice, selectedPackage.cards);
                    console.log('✅ Email xác nhận đã gửi tới:', userEmail);
                } catch (e) {
                    console.warn('⚠️ Gửi email xác nhận thất bại:', e);
                }
            } else {
                console.warn('⚠️ Không có userEmail để gửi mail xác nhận');
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

    // ==================== STEP 1: PACKAGES ====================
    if (step === 'packages') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold mb-3">
                        <Crown className="w-3.5 h-3.5" /> NÂNG CẤP TÀI KHOẢN
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Chọn gói nâng cấp</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mở khóa sức mạnh AI để tạo từ vựng tự động</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-medium">
                        <CreditCard className="w-3.5 h-3.5" />
                        Credits hiện tại: <strong className={creditsRemaining > 20 ? 'text-emerald-600 dark:text-emerald-400' : creditsRemaining > 0 ? 'text-amber-600' : 'text-red-500'}>{creditsRemaining}</strong>
                    </div>
                </div>

                {/* Flash sale banner */}
                {(() => {
                    const maxDiscount = packages.reduce((max, pkg) => {
                        if (!pkg.originalPrice || !pkg.salePrice) return max;
                        const discount = Math.round((1 - pkg.salePrice / pkg.originalPrice) * 100);
                        return discount > max ? discount : max;
                    }, 0);
                    return maxDiscount > 0 ? (
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-xl text-center mb-4">
                            <p className="font-bold text-sm">🔥 FLASH SALE - Giảm đến {maxDiscount}% 🔥</p>
                        </div>
                    ) : null;
                })()}

                {/* Packages grid */}
                <div className="grid grid-cols-2 gap-3">
                    {packages.map(pkg => {
                        const Icon = ICONS[pkg.id] || Zap;
                        const color = COLORS[pkg.id] || COLORS.starter;
                        const bgLight = BG_LIGHT[pkg.id] || BG_LIGHT.starter;
                        const hasDiscount = pkg.originalPrice && pkg.salePrice && pkg.originalPrice > pkg.salePrice;
                        const discount = hasDiscount ? Math.round((1 - pkg.salePrice / pkg.originalPrice) * 100) : 0;
                        const isPopular = pkg.id === 'popular';
                        const displayPrice = pkg.salePrice || pkg.originalPrice;
                        return (
                            <div
                                key={pkg.id}
                                onClick={() => handleSelectPackage(pkg)}
                                className={`relative bg-gradient-to-br ${bgLight} rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${isPopular
                                    ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200/50 dark:ring-indigo-800/50'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                                    }`}
                            >
                                {isPopular && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-md">⭐ PHỔ BIẾN</div>
                                )}
                                {hasDiscount && discount > 0 && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-9 h-9 rounded-full flex items-center justify-center shadow-md">-{discount}%</div>
                                )}

                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">{pkg.name}</h3>
                                {pkg.cards && <p className="text-indigo-600 dark:text-indigo-400 font-bold text-base">{pkg.cards.toLocaleString()} thẻ AI</p>}
                                {pkg.originalPrice && hasDiscount && <p className="text-gray-400 line-through text-[11px] mt-1">{formatVND(pkg.originalPrice)}</p>}
                                {displayPrice && <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{formatVND(displayPrice)}</p>}
                                <div className={`w-full mt-2.5 py-2 rounded-xl text-white font-bold text-xs bg-gradient-to-r ${color} flex items-center justify-center gap-1.5 shadow-md`}>
                                    Chọn gói <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Features */}
                <div className="mt-5 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <p className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">✨ Mỗi thẻ AI bao gồm:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {['Furigana tự động', 'Nghĩa tiếng Việt', 'Câu ví dụ', 'Âm Hán Việt', 'Từ đồng nghĩa', 'Sắc thái', 'JLPT level', 'Từ loại'].map(f => (
                            <div key={f} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}
                            </div>
                        ))}
                    </div>
                </div>
            </div >
        );
    }

    // ==================== STEP 2: PACKAGE INFO + VOUCHER ====================
    if (step === 'info' && selectedPackage) {
        const color = COLORS[selectedPackage.id] || COLORS.starter;
        const Icon = ICONS[selectedPackage.id] || Zap;
        return (
            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Back */}
                <button onClick={() => { setStep('packages'); setAppliedVoucher(null); setVoucherCode(''); setVoucherError(''); }} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Chọn gói khác
                </button>

                {/* Package Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${color} px-5 py-4 text-white`}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Gói {selectedPackage.name}</h2>
                                {selectedPackage.cards && <p className="text-white/80 text-sm">{selectedPackage.cards.toLocaleString()} thẻ AI</p>}
                            </div>
                        </div>
                    </div>

                    {/* Info rows */}
                    <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Tên gói</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-white">{selectedPackage.name}</span>
                        </div>
                        {selectedPackage.cards && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Số thẻ AI</span>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{selectedPackage.cards.toLocaleString()} thẻ</span>
                            </div>
                        )}
                        {selectedPackage.originalPrice && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Giá gốc</span>
                                <span className="text-sm text-gray-400 line-through">{formatVND(selectedPackage.originalPrice)}</span>
                            </div>
                        )}
                        {(selectedPackage.salePrice || selectedPackage.originalPrice) && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedPackage.salePrice ? 'Giá sale' : 'Giá'}</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatVND(selectedPackage.salePrice || selectedPackage.originalPrice)}</span>
                            </div>
                        )}

                        {/* Voucher Section */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2.5">🎟️ Mã giảm giá</p>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={voucherCode}
                                        onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(''); }}
                                        placeholder="Nhập mã giảm giá"
                                        disabled={!!appliedVoucher}
                                        className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-mono uppercase dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 transition-all"
                                    />
                                </div>
                                {appliedVoucher ? (
                                    <button onClick={handleRemoveVoucher} className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-1 border border-red-200 dark:border-red-800">
                                        <X className="w-3.5 h-3.5" /> Hủy
                                    </button>
                                ) : (
                                    <button onClick={handleApplyVoucher} disabled={voucherLoading || !voucherCode.trim()} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                                        {voucherLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                        Áp dụng
                                    </button>
                                )}
                            </div>
                            {voucherError && <p className="mt-2 text-xs text-red-500 font-medium">{voucherError}</p>}
                            {appliedVoucher && (
                                <div className="mt-2.5 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                        Voucher <strong>{appliedVoucher.code}</strong>: Giảm {appliedVoucher.discountType === 'percent' ? `${appliedVoucher.discountValue}%` : formatVND(appliedVoucher.discountValue)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Discount display */}
                        {appliedVoucher && discountAmount > 0 && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Giảm giá</span>
                                <span className="text-sm font-bold text-red-500">-{formatVND(discountAmount)}</span>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex items-center justify-between py-3 mt-1">
                            <span className="text-base font-bold text-gray-800 dark:text-white">Tổng thanh toán</span>
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatVND(finalPrice)}</span>
                        </div>
                    </div>
                </div>

                {/* Continue button */}
                <button
                    onClick={handleProceedToPayment}
                    className={`w-full mt-4 py-3.5 rounded-2xl text-white font-bold text-base bg-gradient-to-r ${color} flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]`}
                >
                    Tiếp tục thanh toán <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // ==================== STEP 3: PAYMENT (QR + Instructions) ====================
    if (step === 'payment' && selectedPackage) {
        if (paymentSuccess) {
            return (
                <div className="max-w-lg mx-auto px-4 py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Thanh toán thành công! 🎉</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Đã cộng <strong className="text-indigo-600 dark:text-indigo-400">{selectedPackage.cards.toLocaleString()} thẻ AI</strong> vào tài khoản.
                    </p>
                    {appliedVoucher && <p className="text-xs text-emerald-500 mb-4">🎟️ Đã sử dụng voucher <strong>{appliedVoucher.code}</strong></p>}
                    <button onClick={() => { setStep('packages'); setSelectedPackage(null); setPaymentSuccess(false); }} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg">
                        Bắt đầu tạo từ vựng! ✨
                    </button>
                </div>
            );
        }

        if (submitted) {
            return (
                <div className="max-w-lg mx-auto px-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Đã gửi yêu cầu!</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Yêu cầu nạp <strong>{selectedPackage.cards.toLocaleString()} thẻ</strong> đã ghi nhận. Admin sẽ xác nhận sớm nhất.
                    </p>
                    <button onClick={() => { setStep('packages'); setSelectedPackage(null); setSubmitted(false); }} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg">
                        Quay lại
                    </button>
                </div>
            );
        }

        const color = COLORS[selectedPackage.id] || COLORS.starter;
        const Icon = ICONS[selectedPackage.id] || Zap;
        return (
            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Back */}
                <button onClick={() => { setStep('info'); if (pollingRef.current) clearInterval(pollingRef.current); if (countdownRef.current) clearInterval(countdownRef.current); setChecking(false); }} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>

                {/* Package summary */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">Gói {selectedPackage.name}</h3>
                                <p className="text-xs text-gray-500">{selectedPackage.cards.toLocaleString()} thẻ AI</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {appliedVoucher && discountAmount > 0 && <p className="text-xs text-gray-400 line-through">{formatVND(selectedPackage.salePrice)}</p>}
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatVND(finalPrice)}</p>
                            {appliedVoucher && <p className="text-[10px] text-emerald-500">🎟️ {appliedVoucher.code}</p>}
                        </div>
                    </div>
                </div>

                {/* QR Code */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4 shadow-sm">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-bold mb-4">
                        <QrCode className="w-4 h-4" /> Quét QR để thanh toán
                    </div>
                    <div className="flex justify-center mb-4">
                        <img src={qrUrl} alt="QR Thanh toán" className="w-56 h-56 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 p-2" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>

                    {/* Bank Info */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-bold mb-2">💳 Thông tin chuyển khoản:</p>
                        {[
                            { label: 'Ngân hàng', value: bankId, key: null },
                            { label: 'Số tài khoản', value: bankAccountNo, key: 'stk' },
                            { label: 'Chủ tài khoản', value: bankAccountName, key: null },
                            { label: 'Số tiền', value: formatVND(finalPrice), key: 'amount', rawValue: String(finalPrice), highlight: true },
                            { label: 'Nội dung CK', value: orderCode, key: 'nd', highlight: true },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between text-xs">
                                <span className="text-amber-600 dark:text-amber-400">{row.label}:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-bold ${row.highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-300'}`}>{row.value}</span>
                                    {row.key && (
                                        <button onClick={() => copyToClipboard(row.rawValue || row.value, row.key)} className="text-indigo-500 hover:text-indigo-700 p-0.5">
                                            {copied === row.key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Auto-check status */}
                {checking && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-center mb-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Đang chờ thanh toán...</span>
                        </div>
                        <p className="text-xs text-indigo-500">
                            Hệ thống tự động xác nhận khi nhận được chuyển khoản ({Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')})
                        </p>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        📋 HƯỚNG DẪN NÂNG CẤP
                    </h3>
                    <div className="space-y-2.5">
                        {[
                            { step: 'B1', text: 'Mở ứng dụng ngân hàng' },
                            { step: 'B2', text: 'Chọn tính năng quét mã QR' },
                            { step: 'B3', text: 'Quét mã QR ở trên' },
                            { step: 'B4', text: 'Kiểm tra thông tin tài khoản, số tiền, nội dung chuyển khoản' },
                            { step: 'B5', text: 'Thực hiện giao dịch' },
                            { step: 'B6', text: 'Gửi ảnh chụp màn hình chuyển khoản thành công cho chúng mình qua 1 trong các kênh bên dưới nếu không kích hoạt thành công gói đăng ký' },
                        ].map(item => (
                            <div key={item.step} className="flex gap-3">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                    {item.step}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-1">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Support Channels */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">📞 Kênh hỗ trợ</h3>
                    <div className="space-y-2">
                        {supportChannels.zalo && (
                            <a href={supportChannels.zalo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-md">Zalo</div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Zalo</p>
                                    <p className="text-[10px] text-blue-500 dark:text-blue-500">Nhắn tin qua Zalo</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                            </a>
                        )}
                        {supportChannels.messenger && (
                            <a href={supportChannels.messenger} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                                    <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-purple-700 dark:text-purple-400">Messenger</p>
                                    <p className="text-[10px] text-purple-500">Nhắn tin qua Messenger</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
                            </a>
                        )}
                        {supportChannels.email && (
                            <a href={`mailto:${supportChannels.email}`} className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md">
                                    <Mail className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Email</p>
                                    <p className="text-[10px] text-emerald-500">{supportChannels.email}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
                            </a>
                        )}
                        {!supportChannels.zalo && !supportChannels.messenger && !supportChannels.email && (
                            <p className="text-xs text-gray-400 italic text-center py-2">Chưa có kênh hỗ trợ. Admin vui lòng cấu hình trong trang Quản lý.</p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    {!checking && (
                        <button onClick={handleManualConfirm} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all">
                            Đã chuyển khoản ✓
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default UpgradeScreen;
