import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
                        isApproved: false,
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-4 md:space-y-6 border border-white/50">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">QuizKi</h2>
                    <p className="text-gray-500 text-xs md:text-sm">
                        Đăng nhập để đồng bộ kho từ vựng của bạn trên mọi thiết bị
                    </p>
                </div>

                <div className="flex bg-gray-100 rounded-xl md:rounded-2xl p-0.5 md:p-1 text-xs md:text-sm font-semibold">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all ${mode === 'login'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`flex-1 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all ${mode === 'register'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Đăng ký
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                    <div className="space-y-1.5 md:space-y-2">
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 md:focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Mật khẩu</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 md:px-4 py-2 md:py-3 pr-8 md:pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 md:focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                                placeholder="Tối thiểu 6 ký tự"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            </button>
                        </div>
                    </div>

                    {mode === 'register' && (
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 md:px-4 py-2 md:py-3 pr-8 md:pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 md:focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-xs md:text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="text-xs md:text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2">
                            {info}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl shadow-md md:shadow-lg shadow-indigo-200 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 mx-auto" />
                        ) : mode === 'login' ? (
                            'Đăng nhập'
                        ) : (
                            'Đăng ký tài khoản mới'
                        )}
                    </button>
                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isLoading}
                            className="w-full text-[10px] md:text-xs text-indigo-600 hover:text-indigo-700 text-right mt-0.5 md:mt-1"
                        >
                            Quên mật khẩu?
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
