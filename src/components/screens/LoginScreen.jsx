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
import { Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';

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
                        isApproved: true, // Người dùng được duyệt tự động, admin có thể huỷ kích hoạt sau
                        createdAt: serverTimestamp()
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
                    // Create new profile for Google user
                    const defaultName = user.displayName || user.email?.split('@')[0] || 'Người học';
                    await setDoc(profileRef, {
                        displayName: defaultName,
                        dailyGoal: 10,
                        hasSeenHelp: true,
                        isApproved: true, // Người dùng được duyệt tự động, admin có thể huỷ kích hoạt sau
                        createdAt: serverTimestamp()
                    }, { merge: true });
                }
            }
            // Google sign-in successful - user is now logged in
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
        <div className="min-h-screen relative overflow-hidden">
            {/* Full screen gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
                {/* Decorative floating shapes */}
                <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl"></div>
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-400/15 rounded-full blur-2xl"></div>
            </div>

            {/* Centered login card */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-[480px] bg-white shadow-2xl rounded-2xl p-6 md:p-8 space-y-5">
                    {/* Logo and Title */}
                    <div className="text-center space-y-2">
                        <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg mx-auto flex items-center justify-center shadow-md">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">QuizKi</h1>
                            <p className="text-gray-400 text-[10px]">Học từ vựng thông minh</p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5 text-[11px] font-medium">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className={`flex-1 py-1.5 rounded-md transition-all ${mode === 'login'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Đăng nhập
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('register')}
                            className={`flex-1 py-1.5 rounded-md transition-all ${mode === 'register'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Đăng ký
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 mb-1">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all"
                                    placeholder="Tối thiểu 6 ký tự"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-2.5 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">Xác nhận mật khẩu</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all"
                                        placeholder="Nhập lại mật khẩu"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 px-2.5 flex items-center text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error/Info Messages */}
                        {error && (
                            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                                {info}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin w-4 h-4 mx-auto" />
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
                                className="w-full text-[10px] text-indigo-600 hover:text-indigo-700 text-center"
                            >
                                Quên mật khẩu?
                            </button>
                        )}
                    </form>

                    {/* Divider */}
                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px]">
                            <span className="px-2 bg-white text-gray-400">hoặc</span>
                        </div>
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Tiếp tục với Google
                    </button>

                    {/* Footer */}
                    <p className="text-center text-[10px] text-gray-400 pt-1">
                        Bằng việc đăng nhập, bạn đồng ý với điều khoản sử dụng
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
