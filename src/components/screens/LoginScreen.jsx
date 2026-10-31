import React, { useState, useEffect, useRef } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signInWithRedirect
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, appId } from '../../config/firebase';
import { Loader2, Eye, EyeOff, Brain, BookOpen, Gamepad2, Database, Route } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import QuizKiLogo from '../ui/QuizKiLogo';
import { useLanguage } from '../../context/LanguageContext';
import { showToast } from '../../utils/toast';

const ROADMAP_KEY = 'quizki_user_roadmap';

// Helper to sync onboarding survey roadmap & clean guest mode on auth
const syncUserRoadmapAndProfile = async (user, customDisplayName, language = 'vi') => {
    if (!db || !user) return;
    try {
        const userEmail = (user.email || '').trim();
        const defaultName = customDisplayName || user.displayName || userEmail.split('@')[0] || (language === 'vi' ? 'Người học' : 'Learner');
        const userPhoto = user.photoURL || '';

        let roadmapData = null;
        try {
            const rawRoadmap = localStorage.getItem(ROADMAP_KEY);
            if (rawRoadmap) roadmapData = JSON.parse(rawRoadmap);
        } catch (_) {}

        const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/settings/profile`);
        const profileSnap = await getDoc(profileRef);

        const profilePayload = {
            displayName: defaultName,
            email: userEmail,
            lastLoginAt: Date.now(),
            updatedAt: Date.now()
        };

        if (!profileSnap.exists()) {
            profilePayload.dailyGoal = roadmapData?.dailyGoal || 15;
            profilePayload.targetLanguage = roadmapData?.targetLang || 'ja';
            profilePayload.hasSeenHelp = true;
            profilePayload.createdAt = serverTimestamp();
        } else if (!profileSnap.data()?.email) {
            profilePayload.email = userEmail;
        }

        await setDoc(profileRef, profilePayload, { merge: true });

        if (roadmapData) {
            const roadmapRef = doc(db, `artifacts/${appId}/users/${user.uid}/settings/roadmap`);
            await setDoc(roadmapRef, {
                ...roadmapData,
                updatedAt: Date.now()
            }, { merge: true });
        }

        const statsRef = doc(db, `artifacts/${appId}/public/data/userStats`, user.uid);
        await setDoc(statsRef, {
            userId: user.uid,
            email: userEmail,
            displayName: defaultName,
            photoURL: userPhoto,
            lastLoginAt: Date.now(),
            lastActive: Date.now(),
            updatedAt: Date.now()
        }, { merge: true }).catch(err => console.warn('Sync userStats warning:', err));

        localStorage.removeItem('quizki_guest_mode');
    } catch (err) {
        console.warn('Sync user roadmap error:', err);
    }
};

// Cooldown tracking for email sending (prevent too-many-requests)
let lastVerificationEmailTime = 0;
let lastPasswordResetTime = 0;
const EMAIL_COOLDOWN_MS = 60000; // 60 seconds cooldown between emails
const LoginScreen = () => {
    const { t, language } = useLanguage();
    const [searchParams] = useSearchParams();
    const gisInitializedRef = useRef(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mode, setMode] = useState(() => {
        try {
            const modeParam = searchParams.get('mode');
            return modeParam === 'register' ? 'register' : 'login';
        } catch (_) {
            return 'login';
        }
    }); // 'login' | 'register'

    useEffect(() => {
        const modeParam = searchParams.get('mode');
        if (modeParam === 'register' || modeParam === 'login') {
            setMode(modeParam);
        }
    }, [searchParams]);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const isAnyLoading = isEmailLoading || isGoogleLoading;
    const [error, setErrorState] = useState('');
    const [info, setInfoState] = useState('');
    const setError = (msg) => {
        setErrorState(msg);
        if (msg) showToast(msg, 'error');
    };
    const setInfo = (msg) => {
        setInfoState(msg);
        if (msg) showToast(msg, 'info');
    };
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Reset body style locks and loading states when LoginScreen mounts
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = '';
        setIsEmailLoading(false);
        setIsGoogleLoading(false);
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    // Auto-unfreeze Google loading state if user refocuses parent window after closing popup
    useEffect(() => {
        if (!isGoogleLoading) return;
        const handleWindowFocus = () => {
            const timer = setTimeout(() => {
                setIsGoogleLoading(false);
            }, 1200);
            return () => clearTimeout(timer);
        };
        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, [isGoogleLoading]);

    const handleCredentialResponse = async (response) => {
        if (!auth) return;
        setError('');
        setInfo('');
        setIsGoogleLoading(true);
        try {
            const credential = GoogleAuthProvider.credential(response.credential);
            const result = await signInWithCredential(auth, credential);
            const user = result.user;
            if (db && user) {
                await syncUserRoadmapAndProfile(user, null, language);
            }
        } catch (e) {
            console.error('Lỗi đăng nhập Google GIS:', e);
            if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
                setError(t('auth.googleFailed', 'Đăng nhập bằng Google không thành công. Vui lòng thử lại.'));
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    useEffect(() => {
        let timer;
        const initGis = () => {
            if (window.google?.accounts?.id) {
                if (!window.__quizki_gis_initialized) {
                    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "28989364918-a2a99ad3fc0c23fca6417.apps.googleusercontent.com";
                    try {
                        window.google.accounts.id.initialize({
                            client_id: clientId,
                            callback: handleCredentialResponse
                        });
                        window.__quizki_gis_initialized = true;
                        gisInitializedRef.current = true;
                    } catch (err) {
                        console.warn("Lỗi khởi tạo Google GIS:", err);
                    }
                }
                if (timer) clearInterval(timer);
            }
        };

        initGis();
        timer = setInterval(initGis, 1000);

        return () => {
            if (timer) clearInterval(timer);
        };
    }, []);



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!auth) return;
        setError('');
        setInfo('');
        if (mode === 'register') {
            if (password.length < 6) {
                setError(t('auth.passMinLength', 'Mật khẩu phải có ít nhất 6 ký tự.'));
                return;
            }
            if (password !== confirmPassword) {
                setError(t('auth.passMismatch', 'Mật khẩu xác nhận không khớp.'));
                return;
            }
        }
        setIsEmailLoading(true);
        try {
            if (mode === 'login') {
                const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
                if (!cred.user.emailVerified) {
                    const now = Date.now();
                    const timeSinceLastEmail = now - lastVerificationEmailTime;
                    if (timeSinceLastEmail < EMAIL_COOLDOWN_MS) {
                        const waitSeconds = Math.ceil((EMAIL_COOLDOWN_MS - timeSinceLastEmail) / 1000);
                        setError(language === 'vi' ? `Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư (và mục Spam/Junk). Bạn có thể yêu cầu gửi lại sau ${waitSeconds} giây.` : `Your email is not verified. Please check your inbox (and Spam/Junk). You can request resend in ${waitSeconds} seconds.`);
                    } else {
                        let verificationMsg = language === 'vi' ? 'Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư (và mục Spam/Junk), bấm vào link xác nhận rồi đăng nhập lại.' : 'Your email is not verified. Please check your inbox (and Spam/Junk), click confirmation link and sign in again.';
                        try {
                            await sendEmailVerification(cred.user);
                            lastVerificationEmailTime = Date.now();
                            verificationMsg = (language === 'vi' ? '✅ Đã gửi lại email xác thực! ' : '✅ Verification email resent! ') + verificationMsg;
                        } catch (ve) {
                            console.error('Lỗi gửi lại email xác thực:', ve);
                            if (ve.code === 'auth/too-many-requests') {
                                lastVerificationEmailTime = Date.now(); // Set cooldown anyway
                                verificationMsg = language === 'vi' ? '⚠️ Bạn đã yêu cầu gửi email quá nhiều lần. Vui lòng kiểm tra hộp thư (và mục Spam/Junk) hoặc đợi 1-2 phút trước khi thử lại.' : '⚠️ Too many requests. Please wait 1-2 minutes before trying again.';
                            }
                        }
                        setError(verificationMsg);
                    }
                    await signOut(auth);
                    return;
                }
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                try {
                    await sendEmailVerification(cred.user);
                    lastVerificationEmailTime = Date.now();
                    setInfo(t('auth.verificationEmailSent', '🎉 Đăng ký thành công! Một email xác thực đã được gửi. Vui lòng kiểm tra hộp thư (và mục Spam/Junk) rồi bấm vào link xác nhận.'));
                } catch (ve) {
                    console.error('Lỗi gửi email xác thực:', ve);
                    if (ve.code === 'auth/too-many-requests') {
                        lastVerificationEmailTime = Date.now();
                        setInfo(language === 'vi' ? 'Đăng ký thành công! Nhưng hệ thống đang bận. Vui lòng chờ 1-2 phút rồi đăng nhập lại để nhận email xác thực.' : 'Registration successful! Please wait 1-2 minutes and sign in again.');
                    } else {
                        setInfo(language === 'vi' ? 'Đăng ký thành công! Nhưng không gửi được email xác thực. Vui lòng đăng nhập lại để nhận email xác thực mới.' : 'Registration successful! Could not send verification email. Please sign in again.');
                    }
                }
                if (db) {
                    await syncUserRoadmapAndProfile(cred.user, email.trim().split('@')[0], language);
                }
                await signOut(auth);
            }
        } catch (e) {
            console.error('Lỗi đăng nhập:', e);
            let msg = '';
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                msg = t('auth.wrongCredentials', 'Email hoặc mật khẩu không đúng.');
            } else if (e.code === 'auth/user-not-found') {
                msg = t('auth.userNotFound', 'Tài khoản không tồn tại. Hãy chọn Đăng ký.');
            } else if (e.code === 'auth/email-already-in-use') {
                msg = t('auth.emailInUse', 'Email này đã được đăng ký, hãy chuyển sang Đăng nhập.');
            } else if (e.code === 'auth/weak-password') {
                msg = t('auth.passMinLength', 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu từ 6 ký tự trở lên.');
            } else if (e.code === 'auth/operation-not-allowed') {
                msg = 'Email/Password Auth chưa được bật trong Firebase Console.';
            }
            if (msg) setError(msg);
        } finally {
            setIsEmailLoading(false);
        }
    };
    const handleResetPassword = async () => {
        if (!auth) return;
        setError('');
        setInfo('');
        if (!email.trim()) {
            setError(t('auth.enterEmailToReset', 'Vui lòng nhập email để đặt lại mật khẩu.'));
            return;
        }
        // Check cooldown
        const now = Date.now();
        const timeSinceLastReset = now - lastPasswordResetTime;
        if (timeSinceLastReset < EMAIL_COOLDOWN_MS) {
            const waitSeconds = Math.ceil((EMAIL_COOLDOWN_MS - timeSinceLastReset) / 1000);
            setError(language === 'vi' ? `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu gửi lại email đặt lại mật khẩu.` : `Please wait ${waitSeconds} seconds before requesting reset email again.`);
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            lastPasswordResetTime = Date.now();
            setInfo(t('auth.resetEmailSent', '✅ Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư (và mục Spam/Junk). Bấm vào link trong email để đặt mật khẩu mới.'));
        } catch (e) {
            console.error('Lỗi quên mật khẩu:', e);
            let msg = language === 'vi' ? 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.' : 'Could not send password reset email. Please try again.';
            if (e.code === 'auth/user-not-found') {
                msg = t('auth.userNotFound', 'Không tìm thấy tài khoản với email này.');
            } else if (e.code === 'auth/too-many-requests') {
                lastPasswordResetTime = Date.now();
                msg = language === 'vi' ? '⚠️ Bạn đã yêu cầu quá nhiều lần. Vui lòng kiểm tra hộp thư (và Spam/Junk) hoặc đợi 1-2 phút trước khi thử lại.' : '⚠️ Too many requests. Please wait 1-2 minutes before trying again.';
            }
            setError(msg);
        }
    };
    const handleGoogleSignIn = async () => {
        if (!auth) return;
        setError('');
        setInfo('');
        setIsGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            console.log("[Quizki Auth] Using signInWithPopup to bypass cross-origin cookie blocking...");
            const result = await signInWithPopup(auth, provider);
            const user = result?.user;
            if (db && user) {
                await syncUserRoadmapAndProfile(user, null, language);
            }
        } catch (e) {
            console.error('Lỗi đăng nhập Google:', e);
            if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
                // Người dùng chủ động tắt popup Google - không báo lỗi, mở khóa ngay lập tức
                console.log('Google sign-in popup closed by user');
            } else if (e.code === 'auth/popup-blocked') {
                setError(t('auth.popupBlocked', 'Cửa sổ popup bị chặn bởi trình duyệt. Vui lòng cho phép popup và thử lại.'));
            } else {
                setError(t('auth.googleFailed', 'Đăng nhập Google không thành công. Vui lòng thử lại.'));
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };
    return (
        <div className="h-screen h-[100dvh] w-full bg-[#fdfbf7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between fixed inset-0 z-50 overflow-hidden font-sans select-none selection:bg-emerald-500 selection:text-white">
            {/* Top Bar: Back to Home & Logo */}
            <header className="h-12 sm:h-14 shrink-0 w-full max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between z-10">
                <Link
                    to="/"
                    className="group select-none cursor-pointer"
                >
                    <QuizKiLogo size="md" showSubtitle={false} />
                </Link>

                <Link
                    to="/"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 transition-all select-none cursor-pointer"
                >
                    ✕ {t('common.close', 'Đóng')}
                </Link>
            </header>

            {/* Center Auth Card: Duolingo Compact Aesthetic */}
            <main className="flex-1 min-h-0 w-full flex items-center justify-center px-4 py-1 overflow-hidden">
                <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-xl p-4 sm:p-5 space-y-2.5 animate-scale-up my-auto">
                    {/* Header */}
                    <div className="text-center space-y-0.5">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            <span className="text-xl">{mode === 'login' ? '👋' : '🎉'}</span>
                            <span>
                                {mode === 'login'
                                    ? t('auth.loginTitle', 'Đăng nhập vào QuizKi')
                                    : t('auth.signupTitle', 'Tạo tài khoản mới')}
                            </span>
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            {mode === 'login'
                                ? t('auth.loginSubtitle', 'Chào mừng bạn trở lại với lộ trình học ngoại ngữ!')
                                : t('auth.signupSubtitle', 'Đăng ký miễn phí để lưu tiến trình học vĩnh viễn.')}
                        </p>
                    </div>

                    {/* Google Sign-in */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isAnyLoading}
                        className="w-full py-2.5 px-3 text-xs font-bold rounded-xl border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 tracking-wider uppercase active:translate-y-0.5 active:border-b-2 cursor-pointer select-none shadow-2xs"
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="animate-spin w-4 h-4 text-slate-600" />
                        ) : (
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        <span className="text-[11px]">{isGoogleLoading ? t('auth.connectingGoogle', 'ĐANG KẾT NỐI GOOGLE...') : t('auth.continueWithGoogle', 'TIẾP TỤC VỚI GOOGLE')}</span>
                    </button>

                    {/* Divider */}
                    <div className="relative py-0.5 flex items-center justify-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                        <span className="px-2.5 bg-white dark:bg-slate-900 text-[9px] text-slate-400 font-black tracking-widest uppercase shrink-0">
                            {t('auth.orDivider', 'HOẶC EMAIL')}
                        </span>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-2">
                        {/* Email */}
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden transition-all font-medium"
                                placeholder={t('auth.emailLabel', 'Email (name@example.com)')}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full py-2.5 pl-3 pr-10 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden transition-all font-medium"
                                    placeholder={mode === 'login' ? 'Mật khẩu' : 'Mật khẩu (tối thiểu 6 ký tự)'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {mode === 'login' && (
                                <div className="flex justify-end pt-0.5">
                                    <button
                                        type="button"
                                        onClick={handleResetPassword}
                                        disabled={isAnyLoading}
                                        className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline uppercase tracking-wide cursor-pointer select-none"
                                    >
                                        {t('auth.forgotPassword', 'QUÊN MẬT KHẨU?')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password (only for register mode) */}
                        {mode === 'register' && (
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full py-2.5 pl-3 pr-10 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden transition-all font-medium"
                                    placeholder={t('auth.confirmPasswordLabel', 'Nhập lại mật khẩu')}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}

                        {/* Submit CTA */}
                        <button
                            type="submit"
                            disabled={isAnyLoading}
                            className="w-full py-2.5 mt-1 text-xs font-black rounded-xl text-white bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wider uppercase cursor-pointer flex items-center justify-center select-none"
                        >
                            {isEmailLoading ? (
                                <Loader2 className="animate-spin w-4 h-4 mx-auto" />
                            ) : mode === 'login' ? (
                                t('auth.loginBtn', 'ĐĂNG NHẬP →')
                            ) : (
                                t('auth.signupBtn', 'ĐĂNG KÝ →')
                            )}
                        </button>
                    </form>

                    {/* Switch Mode Link */}
                    <div className="text-center pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {mode === 'login' ? t('auth.dontHaveAccount', 'Bạn chưa có tài khoản? ') : t('auth.alreadyHaveAccount', 'Đã có tài khoản? ')}
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    setInfo('');
                                    setMode(mode === 'login' ? 'register' : 'login');
                                }}
                                className="font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer ml-1 select-none"
                            >
                                {mode === 'login' ? t('auth.signupNow', 'Đăng ký ngay') : t('auth.loginNow', 'Đăng nhập')}
                            </button>
                        </span>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="h-8 shrink-0 w-full text-center flex items-center justify-center text-[10px] text-slate-400 font-bold tracking-widest space-x-6 z-10 select-none">
                <Link to="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase">{t('auth.terms', 'Điều khoản')}</Link>
                <Link to="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase">{t('auth.privacy', 'Bảo mật')}</Link>
                <Link to="/help" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase">{t('auth.help', 'Trợ giúp')}</Link>
            </footer>
        </div>
    );
};
export default LoginScreen;
