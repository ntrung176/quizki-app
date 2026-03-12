import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    applyActionCode,
    verifyPasswordResetCode,
    confirmPasswordReset
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, KeyRound, MailCheck, Sparkles } from 'lucide-react';

const AuthActionScreen = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'resetPassword'
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');

    // Password reset states
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (!oobCode || !auth) {
            setStatus('error');
            setMessage('Link không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
            return;
        }

        const handleAction = async () => {
            try {
                if (mode === 'verifyEmail') {
                    // Apply the email verification code
                    await applyActionCode(auth, oobCode);
                    setStatus('success');
                    setMessage('Email của bạn đã được xác thực thành công! Bây giờ bạn có thể đăng nhập.');
                } else if (mode === 'resetPassword') {
                    // Verify the password reset code and get email
                    const userEmail = await verifyPasswordResetCode(auth, oobCode);
                    setEmail(userEmail);
                    setStatus('resetPassword');
                } else {
                    setStatus('error');
                    setMessage('Hành động không được hỗ trợ.');
                }
            } catch (e) {
                console.error('Auth action error:', e);
                setStatus('error');
                if (e.code === 'auth/invalid-action-code' || e.code === 'auth/expired-action-code') {
                    setMessage('Link đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại email.');
                } else if (e.code === 'auth/user-disabled') {
                    setMessage('Tài khoản này đã bị vô hiệu hóa.');
                } else {
                    setMessage('Đã xảy ra lỗi. Vui lòng thử lại hoặc yêu cầu gửi lại email.');
                }
            }
        };

        handleAction();
    }, [mode, oobCode]);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || !confirmNewPassword) return;
        if (newPassword.length < 6) {
            setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setMessage('Mật khẩu xác nhận không khớp.');
            return;
        }

        setResetting(true);
        setMessage('');
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setStatus('success');
            setMessage('Mật khẩu đã được đặt lại thành công! Bây giờ bạn có thể đăng nhập với mật khẩu mới.');
        } catch (e) {
            console.error('Password reset error:', e);
            if (e.code === 'auth/invalid-action-code' || e.code === 'auth/expired-action-code') {
                setStatus('error');
                setMessage('Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại email.');
            } else if (e.code === 'auth/weak-password') {
                setMessage('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn (tối thiểu 6 ký tự).');
            } else {
                setMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
            }
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl items-center justify-center shadow-lg mb-3">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">QuizKi</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Loading */}
                    {status === 'loading' && (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Đang xử lý...</h2>
                            <p className="text-sm text-gray-500">Vui lòng đợi trong giây lát.</p>
                        </div>
                    )}

                    {/* Success */}
                    {status === 'success' && (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Thành công!</h2>
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg"
                            >
                                Đi tới trang Đăng nhập
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Có lỗi xảy ra</h2>
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg"
                            >
                                Quay lại trang Đăng nhập
                            </button>
                        </div>
                    )}

                    {/* Reset Password Form */}
                    {status === 'resetPassword' && (
                        <div className="p-8">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
                                    <KeyRound className="w-8 h-8 text-amber-500" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 mb-1">Đặt lại mật khẩu</h2>
                                {email && (
                                    <p className="text-sm text-gray-500">
                                        Tài khoản: <span className="font-medium text-gray-700">{email}</span>
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all pr-10"
                                            placeholder="Tối thiểu 6 ký tự"
                                            required
                                            minLength={6}
                                            disabled={resetting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all pr-10"
                                            placeholder="Nhập lại mật khẩu mới"
                                            required
                                            minLength={6}
                                            disabled={resetting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {message && (
                                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={resetting}
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {resetting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <KeyRound className="w-4 h-4" />
                                            Đặt lại mật khẩu
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    © {new Date().getFullYear()} QuizKi App
                </p>
            </div>
        </div>
    );
};

export default AuthActionScreen;
