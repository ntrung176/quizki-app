import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { Sparkles, Loader2, Eye, EyeOff, BookOpen, BrainCircuit, Gamepad2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

// Application ID for Firebase paths
const appId = typeof __app_id !== 'undefined' ? __app_id : 'quizki-app';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!auth) return;
        setError('');
        setInfo('');

        if (mode === 'register') {
            if (password.length < 6) {
                setError('Mật khẩu phải có ít nhất 6 ký tự.');
                return;
            }
            if (password !== confirmPassword) {
                setError('Mật khẩu xác nhận không khớp.');
                return;
            }
        }

        setIsLoading(true);
        try {
            if (mode === 'login') {
                const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
                if (!cred.user.emailVerified) {
                    try {
                        await sendEmailVerification(cred.user);
                    } catch (ve) {
                        console.error('Lỗi gửi lại email xác thực:', ve);
                    }
                    setError('Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư, bấm vào link xác nhận rồi đăng nhập lại.');
                    await signOut(auth);
                    return;
                }
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                try {
                    await sendEmailVerification(cred.user);
                    setInfo('Đăng ký thành công! Một email xác thực đã được gửi, vui lòng kiểm tra hộp thư và xác thực tài khoản.');
                } catch (ve) {
                    console.error('Lỗi gửi email xác thực:', ve);
                    setInfo('Đăng ký thành công, nhưng không gửi được email xác thực. Vui lòng thử lại chức năng quên mật khẩu hoặc liên hệ hỗ trợ.');
                }
                if (db) {
                    const defaultName = email.trim().split('@')[0];
                    const profileRef = doc(db, `artifacts/${appId}/users/${cred.user.uid}/settings/profile`);
                    await setDoc(profileRef, {
                        displayName: defaultName,
                        dailyGoal: 10,
                        hasSeenHelp: true,
                        createdAt: serverTimestamp(),
                        email: email.trim()
                    }, { merge: true });
                }
                await signOut(auth);
            }
        } catch (e) {
            console.error('Lỗi đăng nhập:', e);
            let msg = '';
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                msg = 'Email hoặc mật khẩu không đúng.';
            } else if (e.code === 'auth/user-not-found') {
                msg = 'Tài khoản không tồn tại. Hãy chọn Đăng ký.';
            } else if (e.code === 'auth/email-already-in-use') {
                msg = 'Email này đã được đăng ký, hãy chuyển sang Đăng nhập.';
            } else if (e.code === 'auth/weak-password') {
                msg = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu từ 6 ký tự trở lên.';
            } else if (e.code === 'auth/operation-not-allowed') {
                msg = 'Email/Password Auth chưa được bật trong Firebase Console.';
            }
            if (msg) setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!auth) return;
        setError('');
        setInfo('');
        if (!email.trim()) {
            setError('Vui lòng nhập email để đặt lại mật khẩu.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setInfo('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.');
        } catch (e) {
            console.error('Lỗi quên mật khẩu:', e);
            const msg = e.code === 'auth/user-not-found'
                ? 'Không tìm thấy tài khoản với email này.'
                : 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.';
            setError(msg);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        setError('');
        setInfo('');
        setIsLoading(true);

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if profile exists, create if not
            if (db) {
                const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/settings/profile`);
                const profileSnap = await getDoc(profileRef);

                if (!profileSnap.exists()) {
                    const defaultName = user.displayName || user.email?.split('@')[0] || 'Người học';
                    await setDoc(profileRef, {
                        displayName: defaultName,
                        dailyGoal: 10,
                        hasSeenHelp: true,
                        createdAt: serverTimestamp(),
                        email: user.email || ''
                    }, { merge: true });
                } else if (!profileSnap.data()?.email) {
                    await setDoc(profileRef, {
                        email: user.email || ''
                    }, { merge: true });
                }
            }
        } catch (e) {
            console.error('Lỗi đăng nhập Google:', e);
            let msg = '';
            if (e.code === 'auth/popup-closed-by-user') {
                msg = 'Bạn đã đóng cửa sổ đăng nhập Google.';
            } else if (e.code === 'auth/popup-blocked') {
                msg = 'Cửa sổ popup bị chặn. Vui lòng cho phép popup và thử lại.';
            } else if (e.code === 'auth/cancelled-popup-request') {
                // User cancelled, no error message needed
            } else if (e.code === 'auth/account-exists-with-different-credential') {
                msg = 'Tài khoản này đã được đăng ký bằng phương thức khác.';
            } else {
                msg = 'Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại.';
            }
            if (msg) setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative bg-slate-50 flex flex-col">
            {/* Split layout: Content (Left) & Auth (Right) */}
            <div className="flex-1 flex flex-col lg:flex-row shadow-lg">

                {/* Left Side: Landing / Features */}
                <div className="flex-1 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-6 lg:p-10 flex flex-col justify-center relative overflow-hidden text-white lg:min-h-[calc(100vh-64px)] rounded-b-3xl lg:rounded-b-none lg:rounded-r-3xl z-10">
                    {/* Decorative Background */}
                    <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl" />

                    <div className="relative z-10 max-w-xl mx-auto lg:mx-0 pr-0 lg:pr-8">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight">QuizKi</span>
                        </div>

                        {/* Tagline */}
                        <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
                            Nền tảng học ngữ pháp và từ vựng thông minh.
                        </h1>
                        <p className="text-base text-indigo-100 mb-8 leading-relaxed max-w-md">
                            Áp dụng phương pháp lặp lại ngắt quãng (Spaced Repetition System) kết hợp cùng AI giúp bạn làm chủ ngôn ngữ nhanh chóng, nhớ lâu hơn và tiết kiệm thời gian.
                        </p>

                        {/* Features List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex gap-3">
                                <div className="mt-1 bg-white/20 p-1.5 rounded-lg backdrop-blur-sm self-start"><BrainCircuit className="w-4 h-4 text-white" /></div>
                                <div>
                                    <h3 className="font-bold text-base">AI Thông minh</h3>
                                    <p className="text-indigo-100 text-xs mt-1">Gợi ý từ vựng, tự động tạo câu ví dụ và giải thích ngữ cảnh.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1 bg-white/20 p-1.5 rounded-lg backdrop-blur-sm self-start"><BookOpen className="w-4 h-4 text-white" /></div>
                                <div>
                                    <h3 className="font-bold text-base">Ôn tập SRS</h3>
                                    <p className="text-indigo-100 text-xs mt-1">Tối ưu hóa thời gian hiển thị thẻ flashcard khi bạn sắp quên.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1 bg-white/20 p-1.5 rounded-lg backdrop-blur-sm self-start"><Gamepad2 className="w-4 h-4 text-white" /></div>
                                <div>
                                    <h3 className="font-bold text-base">Gamification</h3>
                                    <p className="text-indigo-100 text-xs mt-1">Đua top bảng xếp hạng, nuôi thú cưng ảo từ điểm kinh nghiệm.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1 bg-white/20 p-1.5 rounded-lg backdrop-blur-sm self-start"><TrendingUp className="w-4 h-4 text-white" /></div>
                                <div>
                                    <h3 className="font-bold text-base">Kho dữ liệu JLPT</h3>
                                    <p className="text-indigo-100 text-xs mt-1">Hệ thống bài thi mô phỏng JLPT N5-N1 giúp bạn luyện tập thực chiến.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Form */}
                <div className="w-full lg:w-[480px] xl:w-[500px] flex flex-col justify-center p-6 sm:p-10 lg:p-12 bg-white lg:min-h-[calc(100vh-64px)] self-center lg:self-stretch items-center">
                    <div className="w-full max-w-sm mx-auto space-y-6">
                        {/* Mobile Logo Hidden on Desktop */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="inline-flex w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl items-center justify-center shadow-md mb-3">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">QuizKi</h2>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{mode === 'login' ? 'Đăng nhập vào tài khoản' : 'Bắt đầu hành trình mới'}</h2>
                            <p className="text-slate-500 mt-1 text-xs">{mode === 'login' ? 'Vui lòng nhập email và mật khẩu để tiếp tục.' : 'Đăng ký tài khoản miễn phí ngay hôm nay.'}</p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex bg-slate-100 rounded-xl p-1 text-sm font-medium">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2 rounded-lg transition-all ${mode === 'login'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Đăng nhập
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                className={`flex-1 py-2 rounded-lg transition-all ${mode === 'register'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Đăng ký
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                                        placeholder="Tối thiểu 6 ký tự"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Xác nhận mật khẩu</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                                            placeholder="Nhập lại mật khẩu"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error/Info Messages */}
                            {error && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {error}
                                </div>
                            )}
                            {info && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                    {info}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 mt-2 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                                ) : mode === 'login' ? (
                                    'Đăng nhập'
                                ) : (
                                    'Tạo tài khoản'
                                )}
                            </button>

                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    disabled={isLoading}
                                    className="w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 text-center mt-2"
                                >
                                    Quên mật khẩu?
                                </button>
                            )}
                        </form>

                        {/* Divider */}
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-white text-slate-400 font-medium">HOẶC ĐĂNG NHẬP BẰNG</span>
                            </div>
                        </div>

                        {/* Google Sign-In Button */}
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Tài khoản Google
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer with Links required by Google OAuth Verification */}
            <footer className="w-full bg-slate-900 py-4 text-center z-20">
                <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400 max-w-4xl mx-auto px-6">
                    <span className="font-semibold text-slate-300">© 2024 QuizKi App</span>
                    <Link to="/privacy" className="hover:text-white transition-colors underline underline-offset-4">Chính sách bảo mật (Privacy Policy)</Link>
                    <Link to="/terms" className="hover:text-white transition-colors underline underline-offset-4">Điều khoản dịch vụ (Terms of Service)</Link>
                </div>
            </footer>
        </div>
    );
};

export default LoginScreen;
