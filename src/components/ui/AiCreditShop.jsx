import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap, Star, Crown, Gift, Check, ShoppingCart, CreditCard, CheckCircle, Loader2, QrCode, Copy } from 'lucide-react';
import { submitCreditRequest, DEFAULT_AI_PACKAGES, approveCreditRequest } from '../../utils/adminSettings';
import { generateOrderCode, generateVietQR, checkPaymentStatus, getSepayToken } from '../../utils/sepayPayment';

const ICONS = { starter: Zap, popular: Star, best_value: Crown, ultimate: Gift };
const COLORS = {
    starter: 'from-blue-500 to-cyan-500',
    popular: 'from-indigo-500 to-purple-600',
    best_value: 'from-amber-500 to-orange-600',
    ultimate: 'from-rose-500 to-pink-600'
};

const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const AiCreditShop = ({ creditsRemaining = 0, onClose, adminConfig, userId, userName, userEmail }) => {
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [showPaymentInfo, setShowPaymentInfo] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [orderCode, setOrderCode] = useState('');
    const [checking, setChecking] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [copied, setCopied] = useState('');
    const pollingRef = useRef(null);
    const countdownRef = useRef(null);

    const packages = adminConfig?.aiCreditPackages || DEFAULT_AI_PACKAGES;
    const sepayToken = getSepayToken(adminConfig);
    const isAutoPayment = !!sepayToken && (adminConfig?.autoPayment !== false);
    const bankId = adminConfig?.bankId || 'MB';
    const bankAccountNo = adminConfig?.bankAccountNo || '0123456789';
    const bankAccountName = adminConfig?.bankAccountName || 'NGUYEN TRUNG';

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const handlePurchase = (pkg) => {
        setSelectedPackage(pkg);
        setShowPaymentInfo(true);
        setSubmitted(false);
        setPaymentSuccess(false);
        const code = generateOrderCode(userId);
        setOrderCode(code);

        // Start auto-check if SePay is configured
        if (isAutoPayment) {
            setChecking(true);
            setCountdown(300); // 5 minutes timeout
            startPolling(code, pkg);
        }
    };

    const startPolling = (code, pkg) => {
        // Poll every 5 seconds
        pollingRef.current = setInterval(async () => {
            const result = await checkPaymentStatus(sepayToken, code, pkg.salePrice);
            if (result && result.success) {
                clearInterval(pollingRef.current);
                clearInterval(countdownRef.current);
                setChecking(false);
                setPaymentSuccess(true);
                // Auto approve: submit request and immediately approve
                await submitCreditRequest(userId, userName, userEmail, { ...pkg, id: pkg.id });
                // Credits will be added by admin approval or auto-add
                try {
                    const { addCreditsToUser } = await import('../../utils/adminSettings');
                    await addCreditsToUser(userId, pkg.cards);
                } catch (e) { console.warn('Auto add credits error:', e); }
            }
        }, 5000);

        // Countdown timer
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(pollingRef.current);
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
        const ok = await submitCreditRequest(userId, userName, userEmail, selectedPackage);
        if (ok) setSubmitted(true);
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    };

    const qrUrl = selectedPackage ? generateVietQR(bankId, bankAccountNo, bankAccountName, selectedPackage.salePrice, orderCode) : '';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-3 rounded-t-2xl text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            <span className="font-bold text-sm">Nạp thẻ AI từ vựng</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="text-xs">Còn lại:</span>
                            <span className={`font-bold text-sm ${creditsRemaining > 20 ? 'text-emerald-300' : creditsRemaining > 0 ? 'text-amber-300' : 'text-red-300'}`}>
                                {creditsRemaining}
                            </span>
                        </div>
                    </div>
                </div>

                {!showPaymentInfo ? (
                    <>
                        <div className="mx-3 mt-3 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-center">
                            <p className="font-bold text-xs">🔥 FLASH SALE - Giảm đến 71% 🔥</p>
                        </div>
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {packages.map(pkg => {
                                const Icon = ICONS[pkg.id] || Zap;
                                const color = COLORS[pkg.id] || COLORS.starter;
                                const discount = Math.round((1 - pkg.salePrice / pkg.originalPrice) * 100);
                                const isPopular = pkg.id === 'popular';
                                return (
                                    <div
                                        key={pkg.id}
                                        className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isPopular
                                            ? 'border-indigo-500 dark:border-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}
                                        onClick={() => handlePurchase(pkg)}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">⭐ PHỔ BIẾN</div>
                                        )}
                                        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-8 h-8 rounded-full flex items-center justify-center">-{discount}%</div>
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="font-bold text-gray-800 dark:text-white text-xs">{pkg.name}</h3>
                                        <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{pkg.cards.toLocaleString()} thẻ</p>
                                        <p className="text-gray-400 line-through text-[10px]">{formatVND(pkg.originalPrice)}</p>
                                        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{formatVND(pkg.salePrice)}</p>
                                        <button className={`w-full mt-1.5 py-1.5 rounded-lg text-white font-bold text-xs bg-gradient-to-r ${color} flex items-center justify-center gap-1`}>
                                            <ShoppingCart className="w-3 h-3" /> Mua ngay
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="px-3 pb-3">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                                <p className="font-bold text-[11px] text-gray-700 dark:text-gray-300 mb-1">✨ Mỗi thẻ AI bao gồm:</p>
                                <div className="grid grid-cols-2 gap-1">
                                    {['Furigana tự động', 'Nghĩa tiếng Việt', 'Câu ví dụ', 'Âm Hán Việt', 'Từ đồng nghĩa', 'Sắc thái', 'JLPT level', 'Từ loại'].map(f => (
                                        <div key={f} className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : paymentSuccess ? (
                    /* Payment Success */
                    <div className="p-6 text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Thanh toán thành công! 🎉</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Đã cộng <strong className="text-indigo-600 dark:text-indigo-400">{selectedPackage.cards.toLocaleString()} thẻ AI</strong> vào tài khoản của bạn.
                        </p>
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm">
                            Bắt đầu tạo từ vựng! ✨
                        </button>
                    </div>
                ) : submitted ? (
                    /* Manual submission success */
                    <div className="p-6 text-center space-y-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-7 h-7 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Đã gửi yêu cầu!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Yêu cầu nạp <strong>{selectedPackage.cards.toLocaleString()} thẻ</strong> đã ghi nhận.<br />
                            Admin sẽ xác nhận trong thời gian sớm nhất.
                        </p>
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm">Đóng</button>
                    </div>
                ) : (
                    /* Payment Info with QR */
                    <div className="p-4 space-y-3">
                        <div className="text-center">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COLORS[selectedPackage.id] || COLORS.starter} flex items-center justify-center mx-auto mb-2`}>
                                {React.createElement(ICONS[selectedPackage.id] || Zap, { className: "w-6 h-6 text-white" })}
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">
                                Gói {selectedPackage.name} - {selectedPackage.cards.toLocaleString()} thẻ
                            </h3>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatVND(selectedPackage.salePrice)}</p>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-2">
                                <QrCode className="w-3.5 h-3.5" /> Quét QR để thanh toán
                            </div>
                            <img
                                src={qrUrl}
                                alt="QR Thanh toán"
                                className="w-48 h-48 mx-auto rounded-lg"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>

                        {/* Bank Info */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-bold mb-1.5">💳 Hoặc chuyển khoản thủ công:</p>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-600 dark:text-amber-400">Ngân hàng: <strong>{bankId}</strong></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-600 dark:text-amber-400">STK: <strong>{bankAccountNo}</strong></span>
                                    <button onClick={() => copyToClipboard(bankAccountNo, 'stk')} className="text-indigo-500 hover:text-indigo-700">
                                        {copied === 'stk' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-600 dark:text-amber-400">Chủ TK: <strong>{bankAccountName}</strong></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-600 dark:text-amber-400">Nội dung: <strong className="text-indigo-600 dark:text-indigo-400">{orderCode}</strong></span>
                                    <button onClick={() => copyToClipboard(orderCode, 'nd')} className="text-indigo-500 hover:text-indigo-700">
                                        {copied === 'nd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Auto-check status */}
                        {isAutoPayment && checking && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Đang chờ thanh toán...</span>
                                </div>
                                <p className="text-[10px] text-indigo-500">
                                    Hệ thống sẽ tự động xác nhận khi nhận được chuyển khoản ({Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')})
                                </p>
                            </div>
                        )}

                        {/* Not auto-payment: manual confirm */}
                        {!isAutoPayment && (
                            <p className="text-[10px] text-gray-400 text-center">
                                Sau khi chuyển khoản, bấm "Đã chuyển khoản" để gửi yêu cầu. Admin sẽ xác nhận trong 24h.
                            </p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowPaymentInfo(false); if (pollingRef.current) clearInterval(pollingRef.current); if (countdownRef.current) clearInterval(countdownRef.current); setChecking(false); }}
                                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium text-xs"
                            >← Quay lại</button>
                            {!isAutoPayment && (
                                <button
                                    onClick={handleManualConfirm}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs"
                                >Đã chuyển khoản ✓</button>
                            )}
                        </div>
                    </div>
                )}

                {!submitted && !paymentSuccess && (
                    <div className="pb-3 text-center">
                        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Đóng</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiCreditShop;
