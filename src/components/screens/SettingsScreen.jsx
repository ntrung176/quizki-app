import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, User, Volume2, VolumeX, Music, Sun, Moon, ArrowLeft, Save, Check, X, Palette, Shield, Trash2, Upload, Play, Mic, Edit, Type, Camera, Gift, Copy, Crown, Award, Sparkles } from 'lucide-react'
import AvatarCropper from '../ui/AvatarCropper';
import { ROUTES } from '../../router';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';
import {
    getSfxVolume, isSfxEnabled
} from '../../utils/soundEffects';
import { linkWithPopup, GoogleAuthProvider, unlink } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { showToast } from '../../utils/toast';
import { TTS_VOICES, getTTSVoice, setTTSVoice, speakJapanese } from '../../utils/audio';
const SETTINGS_KEY = 'quizki-settings';
const getSettings = () => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};
const saveSettings = (settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
// ==================== Settings Screen ====================
const SettingsScreen = ({ profile, isDarkMode, setIsDarkMode, userId, onUpdateProfileName, onUpdateAvatar, onChangePassword, isAdmin }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('account');

    const isPremiumUser = (profile?.unlockedSpecializedPackages && (
        profile.unlockedSpecializedPackages.includes('premium') ||
        profile.unlockedSpecializedPackages.includes('premium_1m') ||
        profile.unlockedSpecializedPackages.includes('premium_1y') ||
        profile.unlockedSpecializedPackages.includes('premium_3y') ||
        profile.unlockedSpecializedPackages.includes('vocab_zen') ||
        profile.unlockedSpecializedPackages.includes('grammar_zen') ||
        profile.unlockedSpecializedPackages.includes('kanji_zen') ||
        profile.unlockedSpecializedPackages.includes('jlpt_prep')
    )) || false;

    const hasPremium = (
        profile?.isPremiumUnlocked === true ||
        profile?.isPremium === true ||
        isPremiumUser ||
        (profile?.premiumExpiresAt && (() => {
            try {
                const exp = profile.premiumExpiresAt.toDate ? profile.premiumExpiresAt.toDate() : new Date(profile.premiumExpiresAt);
                return exp > new Date();
            } catch (e) {
                return false;
            }
        })())
    ) || false;

    const getActivePackageName = () => {
        if (!hasPremium) return 'Thành viên Free';
        const packages = profile?.unlockedSpecializedPackages || [];
        if (packages.includes('premium_3y')) return 'Premium 3 Năm';
        if (packages.includes('premium_1y')) return 'Premium 1 Năm';
        if (packages.includes('premium_1m')) return 'Premium 1 Tháng';
        if (packages.includes('premium')) return 'Premium';
        
        const zenPkgs = [];
        if (packages.includes('vocab_zen')) zenPkgs.push('Từ vựng Zen');
        if (packages.includes('grammar_zen')) zenPkgs.push('Ngữ pháp Zen');
        if (packages.includes('kanji_zen')) zenPkgs.push('Kanji Zen');
        if (packages.includes('jlpt_prep')) zenPkgs.push('Luyện thi JLPT');
        if (zenPkgs.length > 0) return `Zen (${zenPkgs.join(', ')})`;
        return 'Premium';
    };

    // Referral States
    const [refStats, setRefStats] = useState({ totalInvited: 0, premiumInvited: 0, friends: [] });
    const [loadingStats, setLoadingStats] = useState(true);
    const [enteredCode, setEnteredCode] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedRaw, setCopiedRaw] = useState(false);

    // Fetch Referral Stats
    useEffect(() => {
        if (!userId) return;
        const fetchStats = async () => {
            try {
                const { getReferralStats } = await import('../../utils/referralService');
                const stats = await getReferralStats(userId);
                setRefStats(stats);
            } catch (e) {
                console.error('Lỗi tải thống kê giới thiệu:', e);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [userId]);

    const handleCopyCode = () => {
        const link = profile?.referralCode ? `${window.location.origin}/?ref=${profile.referralCode}` : '';
        if (!link) return;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyRawCode = () => {
        const code = profile?.referralCode || '';
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2000);
    };

    const handleApplyReferral = async () => {
        if (!enteredCode.trim() || !userId) return;
        setSubmitLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const { submitReferralCode } = await import('../../utils/referralService');
            const res = await submitReferralCode(userId, profile?.displayName || 'Người dùng', enteredCode.trim());
            if (res.success) {
                setSuccessMsg('Áp dụng mã giới thiệu thành công! Bạn nhận được 15 ngày Premium.');
                showToast('Thành công', 'Áp dụng mã giới thiệu thành công!');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                setErrorMsg(res.error || 'Mã không hợp lệ hoặc đã xảy ra lỗi.');
            }
        } catch (e) {
            setErrorMsg(e.message || 'Mã không hợp lệ hoặc đã xảy ra lỗi.');
        } finally {
            setSubmitLoading(false);
        }
    };
    const xpDetails = React.useMemo(() => {
        const xp = profile?.xp || 0;
        return getLevelFromXp(xp);
    }, [profile?.xp]);
    // Account state
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [accountMsg, setAccountMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showAvatarCropper, setShowAvatarCropper] = useState(false);
    const [avatarTab, setAvatarTab] = useState('emoji'); // 'emoji' | 'photo'
    // 50 cute cartoon animal avatars
    const AVATAR_LIST = [
        { id: 'default', emoji: '👤', name: 'Mặc định' },
        { id: 'fox', emoji: '🦊', name: 'Cáo' },
        { id: 'cat', emoji: '🐱', name: 'Mèo' },
        { id: 'dog', emoji: '🐶', name: 'Chó' },
        { id: 'rabbit', emoji: '🐰', name: 'Thỏ' },
        { id: 'bear', emoji: '🐻', name: 'Gấu' },
        { id: 'panda', emoji: '🐼', name: 'Gấu trúc' },
        { id: 'koala', emoji: '🐨', name: 'Koala' },
        { id: 'tiger', emoji: '🐯', name: 'Hổ' },
        { id: 'lion', emoji: '🦁', name: 'Sư tử' },
        { id: 'cow', emoji: '🐮', name: 'Bò' },
        { id: 'pig', emoji: '🐷', name: 'Heo' },
        { id: 'mouse', emoji: '🐭', name: 'Chuột' },
        { id: 'hamster', emoji: '🐹', name: 'Hamster' },
        { id: 'penguin', emoji: '🐧', name: 'Chim cánh cụt' },
        { id: 'chicken', emoji: '🐔', name: 'Gà' },
        { id: 'duck', emoji: '🦆', name: 'Vịt' },
        { id: 'owl', emoji: '🦉', name: 'Cú' },
        { id: 'eagle', emoji: '🦅', name: 'Đại bàng' },
        { id: 'parrot', emoji: '🦜', name: 'Vẹt' },
        { id: 'flamingo', emoji: '🦩', name: 'Hồng hạc' },
        { id: 'frog', emoji: '🐸', name: 'Ếch' },
        { id: 'turtle', emoji: '🐢', name: 'Rùa' },
        { id: 'snake', emoji: '🐍', name: 'Rắn' },
        { id: 'dragon', emoji: '🐉', name: 'Rồng' },
        { id: 'whale', emoji: '🐳', name: 'Cá voi' },
        { id: 'dolphin', emoji: '🐬', name: 'Cá heo' },
        { id: 'octopus', emoji: '🐙', name: 'Bạch tuộc' },
        { id: 'fish', emoji: '🐠', name: 'Cá' },
        { id: 'shark', emoji: '🦈', name: 'Cá mập' },
        { id: 'butterfly', emoji: '🦋', name: 'Bướm' },
        { id: 'bee', emoji: '🐝', name: 'Ong' },
        { id: 'ladybug', emoji: '🐞', name: 'Bọ rùa' },
        { id: 'snail', emoji: '🐌', name: 'Ốc sên' },
        { id: 'monkey', emoji: '🐵', name: 'Khỉ' },
        { id: 'gorilla', emoji: '🦍', name: 'Khỉ đột' },
        { id: 'horse', emoji: '🐴', name: 'Ngựa' },
        { id: 'unicorn', emoji: '🦄', name: 'Kỳ lân' },
        { id: 'zebra', emoji: '🦓', name: 'Ngựa vằn' },
        { id: 'giraffe', emoji: '🦒', name: 'Hươu cao cổ' },
        { id: 'elephant', emoji: '🐘', name: 'Voi' },
        { id: 'rhino', emoji: '🦏', name: 'Tê giác' },
        { id: 'hippo', emoji: '🦛', name: 'Hà mã' },
        { id: 'camel', emoji: '🐫', name: 'Lạc đà' },
        { id: 'deer', emoji: '🦌', name: 'Hươu' },
        { id: 'wolf', emoji: '🐺', name: 'Sói' },
        { id: 'bat', emoji: '🦇', name: 'Dơi' },
        { id: 'raccoon', emoji: '🦝', name: 'Gấu mèo' },
        { id: 'sloth', emoji: '🦥', name: 'Lười' },
        { id: 'hedgehog', emoji: '🦔', name: 'Nhím' },
        { id: 'shrimp', emoji: '🦐', name: 'Tôm' },
    ];
    const getAvatarEmoji = (id) => AVATAR_LIST.find(a => a.id === id)?.emoji || '🦊';
        // Kiểm tra avatar có phải ảnh custom hoặc URL không
    const isCustomPhoto = (avatarValue) => typeof avatarValue === 'string' && avatarValue.startsWith('data:image/');
    const isPhotoUrl = (avatarValue) => typeof avatarValue === 'string' && (avatarValue.startsWith('data:image/') || avatarValue.startsWith('http://') || avatarValue.startsWith('https://'));
    // Lấy display content cho avatar
    const getAvatarDisplay = (avatarValue, sizeClass = 'text-5xl') => {
        if (isPhotoUrl(avatarValue)) {
            return <img src={avatarValue} alt="avatar" className="w-full h-full object-cover" />;
        }
        if (avatarValue === 'default' || !avatarValue) {
            if (auth?.currentUser?.photoURL) {
                return <img src={auth.currentUser.photoURL} alt="avatar" className="w-full h-full object-cover" />;
            }
            return <span className={sizeClass}>👤</span>;
        }
        return <span className={sizeClass}>{getAvatarEmoji(avatarValue)}</span>;
    };
    // Linked accounts state
    const [linkedProviders, setLinkedProviders] = useState([]);
    const [isLinking, setIsLinking] = useState(false);
    // Settings state
    const [sfxVolume, setSfxVolume] = useState(() => getSfxVolume());
    const [sfxEnabled, setSfxEnabled] = useState(() => isSfxEnabled());
    const [furiganaEnabled, setFuriganaEnabled] = useState(() => {
        const settings = getSettings();
        return settings.furiganaEnabled !== false;
    });
    const [furiganaColor, setFuriganaColor] = useState(() => {
        const settings = getSettings();
        return settings.furiganaColor || '#8b5cf6'; // Default color
    });
    const [furiganaFontSize, setFuriganaFontSize] = useState(() => {
        const settings = getSettings();
        return settings.furiganaFontSize || '0.6em'; // Default size
    });

    // TTS voice state
    const [ttsVoice, setTtsVoiceState] = useState(() => getTTSVoice());
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
    // Feedback state - removed, now in FeedbackScreen
    // Update display name when profile changes
    useEffect(() => {
        if (profile?.displayName) setDisplayName(profile.displayName);
    }, [profile]);
    // Load available providers
    useEffect(() => {
        if (auth?.currentUser) {
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
        }
    }, [auth?.currentUser, auth?.currentUser?.providerData]);
    // Save settings whenever they change
    useEffect(() => {
        const settings = getSettings();
        settings.sfxVolume = sfxVolume;
        settings.sfxEnabled = sfxEnabled;
        settings.furiganaEnabled = furiganaEnabled;
        settings.furiganaColor = furiganaColor;
        settings.furiganaFontSize = furiganaFontSize;
        saveSettings(settings);
        // Dispatch event for other components to react
        window.dispatchEvent(new Event('quizki-settings-changed'));
    }, [sfxVolume, sfxEnabled, furiganaEnabled, furiganaColor, furiganaFontSize]);
    // Handle save profile
    const handleSaveProfile = async () => {
        if (!displayName.trim()) return;
        setIsSaving(true);
        try {
            await onUpdateProfileName(displayName.trim());
            setAccountMsg('Đã lưu tên hiển thị!');
            setTimeout(() => setAccountMsg(''), 3000);
        } catch (e) {
            setAccountMsg('Lỗi: ' + e.message);
        }
        setIsSaving(false);
    };
    // Handle select avatar (emoji id hoặc base64 data URL)
    const handleSelectAvatar = async (avatarValue) => {
        if (!onUpdateAvatar) return;
        try {
            await onUpdateAvatar(avatarValue);
            setShowAvatarPicker(false);
            setShowAvatarCropper(false);
            setAccountMsg('Đã cập nhật ảnh đại diện!');
            setTimeout(() => setAccountMsg(''), 3000);
        } catch (e) {
            setAccountMsg('Lỗi: ' + e.message);
        }
    };
    // Handle cropped photo confirm
    const handleCroppedPhoto = async (base64) => {
        await handleSelectAvatar(base64);
    };
    // Handle change password
    const handleChangePassword = async () => {
        if (linkedProviders.includes('password') && !oldPassword) {
            setAccountMsg('Vui lòng nhập mật khẩu hiện tại');
            return;
        }
        if (newPassword.length < 6) {
            setAccountMsg('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        if (newPassword !== confirmPassword) {
            setAccountMsg('Mật khẩu xác nhận không khớp');
            return;
        }
        setIsSaving(true);
        try {
            await onChangePassword(oldPassword, newPassword);
            setOldPassword('');
            setNewPassword('');
            const hasPassword = linkedProviders.includes('password');
            setAccountMsg(hasPassword ? 'Đã đổi mật khẩu thành công!' : 'Đã tạo mật khẩu thành công!');
            setTimeout(() => setAccountMsg(''), 3000);
        } catch (e) {
            console.error('Lỗi đổi mật khẩu:', e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setAccountMsg('Mật khẩu hiện tại không đúng.');
            } else if (e.code === 'auth/requires-recent-login') {
                setAccountMsg('Vì lý do bảo mật, bạn cần đăng xuất và đăng nhập lại trước khi tạo/đổi mật khẩu.');
            } else {
                setAccountMsg('Lỗi: ' + (e.message || 'Không thể đổi mật khẩu'));
            }
        }
        setIsSaving(false);
    };
    // Handle Link Google
    const handleLinkGoogle = async () => {
        if (!auth?.currentUser) return;
        setIsLinking(true);
        try {
            const provider = new GoogleAuthProvider();
            await linkWithPopup(auth.currentUser, provider);
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
            setAccountMsg('Đã liên kết tài khoản Google thành công!');
            setTimeout(() => setAccountMsg(''), 3000);
        } catch (e) {
            console.error('Lỗi liên kết:', e);
            if (e.code === 'auth/credential-already-in-use') {
                setAccountMsg('Tài khoản Google này đã gắn với người dùng khác. Hãy đăng nhập tài khoản đó và xoá dữ liệu nếu muốn liên kết.');
            } else {
                setAccountMsg('Lỗi liên kết: ' + e.message);
            }
        }
        setIsLinking(false);
    };
    // Handle Unlink Google
    const handleUnlinkGoogle = async () => {
        if (!auth?.currentUser) return;
        if (linkedProviders.length <= 1) {
            setAccountMsg('Không thể hủy liên kết phương thức đăng nhập duy nhất.');
            return;
        }
        setIsLinking(true);
        try {
            await unlink(auth.currentUser, 'google.com');
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
            setAccountMsg('Đã hủy liên kết tài khoản Google.');
            setTimeout(() => setAccountMsg(''), 3000);
        } catch (e) {
            console.error('Lỗi hủy liên kết:', e);
            setAccountMsg('Lỗi: ' + e.message);
        }
        setIsLinking(false);
    };
    const tabs = [
        { id: 'account', label: 'Tài khoản', icon: User },
        { id: 'referral', label: 'Giới thiệu bạn bè', icon: Gift },
        { id: 'general', label: 'Cài đặt chung', icon: Settings },
    ];
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                <Link
                    to={ROUTES.HOME}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Cài đặt
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Quản lý tài khoản và tùy chỉnh ứng dụng</p>
                </div>
            </div>
            {/* Tab Navigation */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>
            {/* ==================== ACCOUNT TAB ==================== */}
            {activeTab === 'account' && (
                <div className="space-y-4">
                    {/* Avatar Section & Subscription Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            {/* Left Column: Avatar & User Details */}
                            <div className="lg:col-span-7 flex flex-col sm:flex-row gap-5 items-start">
                                <div className="relative group shrink-0">
                                    <div
                                        className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-sky-100 dark:from-indigo-900/40 dark:to-sky-900/20 flex items-center justify-center text-5xl shadow-lg border-2 border-white dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                    >
                                        {getAvatarDisplay(profile?.avatar)}
                                    </div>
                                    <button
                                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex-1 space-y-2.5 min-w-0 w-full">
                                    <div>
                                        {isEditingName ? (
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <input
                                                    type="text"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter' && displayName.trim() && displayName !== profile?.displayName) {
                                                            await handleSaveProfile();
                                                            setIsEditingName(false);
                                                        } else if (e.key === 'Escape') {
                                                            setDisplayName(profile?.displayName || '');
                                                            setIsEditingName(false);
                                                        }
                                                    }}
                                                    className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm font-bold max-w-[150px] outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={async () => {
                                                        await handleSaveProfile();
                                                        setIsEditingName(false);
                                                    }}
                                                    disabled={isSaving || !displayName.trim() || displayName === profile?.displayName}
                                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {isSaving && (
                                                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                                    )}
                                                    Lưu
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDisplayName(profile?.displayName || '');
                                                        setIsEditingName(false);
                                                    }}
                                                    disabled={isSaving}
                                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1 mb-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-gray-800 dark:text-white text-lg leading-none">{profile?.displayName || 'Chưa đặt tên'}</p>
                                                    <button
                                                        onClick={() => setIsEditingName(true)}
                                                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                                                        title="Chỉnh sửa tên"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                    <span className="bg-sky-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center justify-center">
                                                        LV {xpDetails.level}
                                                    </span>
                                                    <span className="bg-sky-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[120px] flex items-center justify-center" title={getLevelTitle(xpDetails.level)}>
                                                        {getLevelTitle(xpDetails.level)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-gray-550 dark:text-gray-400 text-xs">{profile?.email || 'Không có email'}</p>
                                    </div>
                                    
                                    {/* XP Progress Bar */}
                                    <div className="w-full max-w-sm space-y-1 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-inner">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-450 dark:text-gray-500">
                                            <span>TIẾN TRÌNH CẤP ĐỘ</span>
                                            <span>{xpDetails.remainingXp}/{xpDetails.nextLevelXp} XP</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-[1px]">
                                            <div 
                                                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, Math.round((xpDetails.remainingXp / xpDetails.nextLevelXp) * 100))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Avatar Change Actions */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <button
                                            onClick={() => { setShowAvatarPicker(!showAvatarPicker); setAvatarTab('emoji'); }}
                                            className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
                                        >
                                            {showAvatarPicker ? 'Đóng' : '🎨 Đổi avatar'}
                                        </button>
                                        <span className="text-gray-205 dark:text-gray-700">|</span>
                                        <button
                                            onClick={() => setShowAvatarCropper(true)}
                                            className="text-sky-500 hover:text-sky-600 dark:text-sky-400 font-medium transition-colors flex items-center gap-1"
                                        >
                                            <Camera className="w-3 h-3" />
                                            Tải ảnh lên
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Divider for desktop screen */}
                            <div className="hidden lg:flex lg:col-span-1 justify-center items-center">
                                <div className="w-[1px] h-3/4 bg-gray-100 dark:bg-gray-700" />
                            </div>

                            {/* Right Column: Premium Subscription Info */}
                            <div className="lg:col-span-4 flex flex-col justify-between py-1 space-y-4">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Gói học tập hiện tại</h4>
                                    <div className="flex items-center gap-2">
                                        {hasPremium ? (
                                            <>
                                                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                                    <Crown className="w-3 h-3 fill-white text-white animate-pulse" /> PREMIUM
                                                </span>
                                                <span className="font-extrabold text-sm text-gray-850 dark:text-white">
                                                    {getActivePackageName()}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                    FREE
                                                </span>
                                                <span className="font-extrabold text-sm text-gray-855 dark:text-white">
                                                    Thành viên Miễn phí
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        {hasPremium ? (
                                            <>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    <span>Trạng thái: <strong className="text-emerald-600 dark:text-emerald-450">Đang hoạt động</strong></span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                    <span>Hạn dùng: <strong className="text-indigo-650 dark:text-indigo-400">
                                                        {profile.premiumExpiresAt ? (
                                                            (() => {
                                                                const date = profile.premiumExpiresAt.toDate ? profile.premiumExpiresAt.toDate() : new Date(profile.premiumExpiresAt);
                                                                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                            })()
                                                        ) : 'Vĩnh viễn'}
                                                    </strong></span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="leading-relaxed">
                                                Mở khóa không giới hạn các tính năng AI, Từ vựng, Ngữ pháp và Kanji Zen.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {!hasPremium ? (
                                        <button
                                            onClick={() => navigate(ROUTES.UPGRADE)}
                                            className="w-full py-2.5 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Crown className="w-3.5 h-3.5 fill-white text-white" />
                                            Nâng cấp Premium ngay
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate(ROUTES.UPGRADE)}
                                            className="w-full py-2.5 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Crown className="w-3.5 h-3.5 fill-white text-white" />
                                            Gia hạn / Mua thêm gói
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Avatar Picker Grid */}
                        {showAvatarPicker && (
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-5 pt-4 space-y-3">
                                {/* Tabs: Emoji / Ảnh */}
                                <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1 gap-1">
                                    <button
                                        onClick={() => setAvatarTab('emoji')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${avatarTab === 'emoji' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        🎨 Emoji
                                    </button>
                                    <button
                                        onClick={() => setAvatarTab('photo')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${avatarTab === 'photo' ? 'bg-white dark:bg-gray-600 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        <Camera className="w-3 h-3" /> Ảnh của bạn
                                    </button>
                                </div>
                                {avatarTab === 'emoji' && (
                                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto pr-1">
                                        {AVATAR_LIST.map(avatar => {
                                             const isActive = profile?.avatar === avatar.id || (!profile?.avatar && avatar.id === 'default');
                                             return (
                                                 <button
                                                     key={avatar.id}
                                                     onClick={() => handleSelectAvatar(avatar.id)}
                                                     className={`group relative flex flex-col items-center p-2 rounded-xl transition-all ${isActive
                                                         ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-400 scale-105 shadow-md'
                                                         : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:scale-110 border border-gray-100 dark:border-gray-600'}`}
                                                     title={avatar.name}
                                                 >
                                                     <span className="text-2xl">{avatar.emoji}</span>
                                                     <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-full leading-tight">{avatar.name}</span>
                                                     {isActive && (
                                                         <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                                             <Check className="w-2.5 h-2.5 text-white" />
                                                         </div>
                                                     )}
                                                 </button>
                                             );
                                         })}
                                    </div>
                                )}
                                {avatarTab === 'photo' && (
                                    <div className="space-y-3">
                                        {isCustomPhoto(profile?.avatar) ? (
                                            <div className="flex items-center gap-4 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-sky-300 dark:border-sky-700">
                                                    <img src={profile.avatar} alt="Current avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-sky-700 dark:text-sky-300">Ảnh hiện tại</p>
                                                    <p className="text-[10px] text-sky-500 dark:text-sky-400 mt-0.5">Ảnh tùy chỉnh đang được sử dụng</p>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectAvatar('default')}
                                                    className="text-xs text-red-500 hover:text-red-650 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 py-4">
                                                <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
                                                    <Camera className="w-7 h-7 text-sky-400" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Chưa có ảnh tùy chỉnh</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => { setShowAvatarPicker(false); setShowAvatarCropper(true); }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-sm font-bold shadow-md shadow-sky-200 dark:shadow-sky-900/20 transition-all"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Tải ảnh mới lên
                                        </button>
                                        <p className="text-center text-[10px] text-gray-400 dark:text-gray-600">
                                            Hỗ trợ JPG, PNG, WebP · Có thể cắt và chỉnh vị trí
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Avatar Cropper Modal */}
                    {showAvatarCropper && (
                        <AvatarCropper
                            onConfirm={handleCroppedPhoto}
                            onCancel={() => setShowAvatarCropper(false)}
                            currentAvatarUrl={isCustomPhoto(profile?.avatar) ? profile.avatar : null}
                        />
                    )}

                    {/* Change / Create Password */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" /> {linkedProviders.includes('password') ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
                        </h3>
                        {!linkedProviders.includes('password') && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Bạn đang đăng nhập bằng Google. Hãy tạo một mật khẩu để có thể linh hoạt đăng nhập bằng Email và Mật khẩu.
                            </p>
                        )}
                        {linkedProviders.includes('password') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                    placeholder="Nhập mật khẩu hiện tại"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mật khẩu mới</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                placeholder="Nhập lại mật khẩu mới"
                            />
                        </div>
                        <button
                            onClick={handleChangePassword}
                            disabled={isSaving || !newPassword || !confirmPassword}
                            className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 dark:from-sky-600 dark:to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-sky-600 hover:to-indigo-600 disabled:opacity-50 transition-all"
                        >
                            {linkedProviders.includes('password') ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
                        </button>
                    </div>
                    {/* Associated Accounts */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            Tài khoản liên kết
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Liên kết với Google để có thể đăng nhập bằng một chạm, đồng bộ thiết bị.
                        </p>
                        <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Google</p>
                                    <p className="text-xs text-gray-500">
                                        {linkedProviders.includes('google.com') ? 'Đã liên kết' : 'Chưa liên kết'}
                                    </p>
                                </div>
                            </div>
                            {linkedProviders.includes('google.com') ? (
                                <button
                                    onClick={handleUnlinkGoogle}
                                    disabled={isLinking || linkedProviders.length <= 1}
                                    className="px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-all"
                                >
                                    Hủy liên kết
                                </button>
                            ) : (
                                <button
                                    onClick={handleLinkGoogle}
                                    disabled={isLinking}
                                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 transition-all"
                                >
                                    {isLinking ? 'Đang xử lý...' : 'Liên kết'}
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Message */}
                    {accountMsg && (
                        <div className={`p-3 rounded-xl text-sm font-medium text-center ${accountMsg.includes('Lỗi')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-800'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                            {accountMsg}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== REFERRAL TAB ==================== */}
            {activeTab === 'referral' && (
                <div className="space-y-4">
                    {/* ==================== REFERRAL SECTION ==================== */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-150/50 dark:border-gray-700">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-50 dark:shadow-none">
                                <Gift className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                                    Giới thiệu bạn bè & Nhận quà lũy tiến
                                    <span className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        hot
                                    </span>
                                </h3>
                                <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
                                    Chia sẻ link giới thiệu của bạn cho bạn bè. Khi bạn bè đăng ký tài khoản mới: Bạn nhận ngay 3 ngày Premium và bạn bè nhận ngay 15 ngày Premium dùng thử. Khi họ nâng cấp gói Premium chính thức, bạn sẽ nhận thêm ngày Premium lũy tiến cực khủng!
                                </p>
                            </div>
                        </div>

                        {!isPremiumUser && (
                            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-100 dark:shadow-none flex-shrink-0">
                                        <Crown className="w-6 h-6 text-white fill-white/10" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Tài khoản của bạn chưa nâng cấp Premium</h4>
                                        <p className="text-gray-500 dark:text-slate-450 text-xs mt-0.5 leading-relaxed">
                                            Nâng cấp gói Premium ngay hôm nay để học không giới hạn, hoặc **chia sẻ link giới thiệu bên dưới** cho bạn bè để nhận ngày Premium tích lũy!
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(ROUTES.UPGRADE)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-1.5 shadow-sm shadow-amber-100 dark:shadow-none whitespace-nowrap cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Nâng cấp Premium
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Panel 1: Share Link */}
                            <div className="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-slate-900/40 dark:to-slate-805/20 p-5 rounded-2xl border border-indigo-100/40 dark:border-slate-800 flex flex-col justify-between space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">Link giới thiệu của bạn</h4>
                                    <p className="text-gray-500 dark:text-slate-450 text-[11px] leading-relaxed">
                                        Sao chép link này gửi cho bạn bè. Khi họ đăng ký tài khoản mới qua link của bạn, bạn nhận ngay **3 ngày Premium** và bạn bè nhận ngay **15 ngày Premium dùng thử**!
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-wider">Link chia sẻ</label>
                                        <div className="w-full flex items-center justify-between bg-white dark:bg-slate-850 px-3 py-2 rounded-xl border border-indigo-150/40 dark:border-slate-700 font-mono text-[11px] font-semibold text-indigo-650 dark:text-indigo-400 shadow-sm relative overflow-hidden break-all select-all">
                                            <span>{profile?.referralCode ? `${window.location.origin}/?ref=${profile.referralCode}` : 'ĐANG KHỞI TẠO...'}</span>
                                            <button
                                                type="button"
                                                onClick={handleCopyCode}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 hover:text-indigo-600 transition-colors flex-shrink-0 ml-1"
                                                title="Copy link giới thiệu"
                                            >
                                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {copied && <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center">✓ Đã copy link thành công!</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-wider">Mã giới thiệu riêng</label>
                                        <div className="w-full flex items-center justify-between bg-white dark:bg-slate-850 px-3 py-2 rounded-xl border border-indigo-150/40 dark:border-slate-700 font-mono text-[11px] font-bold text-indigo-650 dark:text-indigo-400 shadow-sm relative overflow-hidden select-all">
                                            <span>{profile?.referralCode || 'ĐANG KHỞI TẠO...'}</span>
                                            <button
                                                type="button"
                                                onClick={handleCopyRawCode}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 hover:text-indigo-600 transition-colors flex-shrink-0 ml-1"
                                                title="Copy mã giới thiệu"
                                            >
                                                {copiedRaw ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {copiedRaw && <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center">✓ Đã copy mã thành công!</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Panel 2: Enter code */}
                            <div className="p-5 rounded-2xl border border-gray-150/50 dark:border-gray-700 bg-gray-50/20 dark:bg-slate-900/10 flex flex-col justify-between space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider mb-2">Nhập mã giới thiệu của bạn bè</h4>
                                    <p className="text-gray-500 dark:text-slate-450 text-[11px] leading-relaxed">
                                        Nếu link giới thiệu không tự động nhận diện, bạn có thể nhập thủ công mã giới thiệu của bạn bè tại đây để nhận **15 ngày Premium** dùng thử và người giới thiệu cũng được cộng **3 ngày Premium**!
                                    </p>
                                </div>

                                {profile?.referredBy ? (
                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/40 px-4 py-3 rounded-xl flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs">
                                            <p className="font-semibold text-emerald-800 dark:text-emerald-450">Đã nhập mã giới thiệu</p>
                                            <p className="text-gray-500 dark:text-slate-400 text-[10px]">Bởi: <span className="font-bold">{profile.referredBy.name}</span></p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nhập mã ví dụ: QKXXXXXX"
                                                value={enteredCode}
                                                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-650 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-900/40 text-gray-900 dark:text-white font-mono uppercase"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyReferral}
                                                disabled={submitLoading || !enteredCode.trim()}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center"
                                            >
                                                {submitLoading ? '...' : 'Gửi'}
                                            </button>
                                        </div>
                                        {errorMsg && <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">{errorMsg}</p>}
                                        {successMsg && <p className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium">{successMsg}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Panel 3: Stats Summary */}
                            <div className="p-5 rounded-2xl border border-gray-150/50 dark:border-gray-700 bg-gray-50/20 dark:bg-slate-900/10 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider mb-2.5">Thống kê giới thiệu của bạn</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 text-center">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Số lượt mời</span>
                                            <span className="text-xl font-extrabold text-gray-800 dark:text-white">{loadingStats ? '...' : refStats.totalInvited}</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 text-center">
                                            <span className="text-[10px] text-amber-500 uppercase font-bold block mb-0.5">Lên Premium</span>
                                            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-0.5">
                                                <Crown className="w-4 h-4 fill-amber-500/20 text-amber-500" />
                                                {loadingStats ? '...' : refStats.premiumInvited}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-750 text-[10px] text-gray-500 dark:text-slate-400 flex items-center justify-between">
                                    <span>Thành viên Free đã mời:</span>
                                    <span className="font-bold text-gray-800 dark:text-slate-300">
                                        {loadingStats ? '...' : refStats.totalInvited - refStats.premiumInvited} người
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progressive Reward Map */}
                        <div className="border border-indigo-50/80 dark:border-slate-750 bg-indigo-50/10 dark:bg-slate-900/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-sky-600" />
                                <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">
                                    Bản đồ phần thưởng Premium lũy tiến (Khi bạn bè nâng cấp Premium)
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
                                {[
                                    { step: 1, label: 'Bạn thứ 1', bonus: '+15 ngày' },
                                    { step: 2, label: 'Bạn thứ 2', bonus: '+30 ngày' },
                                    { step: 3, label: 'Bạn thứ 3', bonus: '+45 ngày' },
                                    { step: 4, label: 'Bạn thứ 4+', bonus: '+60 ngày/bạn' }
                                ].map((milestone) => {
                                    const isAchieved = refStats.premiumInvited >= milestone.step || (milestone.step === 4 && refStats.premiumInvited >= 4);
                                    const isActiveNext = refStats.premiumInvited === milestone.step - 1;
                                    
                                    return (
                                        <div
                                            key={milestone.step}
                                            className={`p-3.5 rounded-xl border flex flex-col items-center justify-between text-center relative overflow-hidden transition-all ${
                                                isAchieved
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400'
                                                    : isActiveNext
                                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-400 shadow-sm shadow-sky-100 dark:shadow-none animate-pulse'
                                                    : 'bg-white dark:bg-slate-800 border-gray-150/40 dark:border-slate-700 text-gray-400'
                                            }`}
                                        >
                                            <div className="absolute top-1.5 right-2 text-[8px] font-black uppercase tracking-wider">
                                                {isAchieved ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">✓ ĐÃ CỘNG</span>
                                                ) : isActiveNext ? (
                                                    <span className="text-sky-600 dark:text-sky-400 flex items-center gap-0.5 animate-bounce">TỚI LƯỢT</span>
                                                ) : (
                                                    <span>CHƯA ĐẠT</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-extrabold block mb-1 uppercase tracking-wider">{milestone.label}</span>
                                            <span className={`text-sm font-black mt-1 ${isAchieved ? 'text-emerald-700 dark:text-emerald-300' : isActiveNext ? 'text-sky-700 dark:text-sky-300' : 'text-gray-700 dark:text-slate-350'}`}>
                                                {milestone.bonus}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Referred Friends History */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider">Lịch sử giới thiệu bạn bè</h4>
                                <span className="text-[10px] text-gray-400">Đã cập nhật mới nhất</span>
                            </div>

                            {loadingStats ? (
                                <div className="text-center py-6 text-xs text-gray-400">Đang tải lịch sử giới thiệu...</div>
                            ) : refStats.friends.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-400">
                                    Chưa có bạn bè nào nhập mã giới thiệu của bạn. Hãy chia sẻ mã để nhận quà nhé!
                                </div>
                            ) : (
                                <div className="overflow-hidden border border-gray-150/40 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-750 text-xs">
                                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase text-gray-400">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2.5 text-left">Tên bạn bè</th>
                                                    <th scope="col" className="px-4 py-2.5 text-center">Trạng thái</th>
                                                    <th scope="col" className="px-4 py-2.5 text-center">Mốc quà tặng</th>
                                                    <th scope="col" className="px-4 py-2.5 text-right">Thời gian</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-750 text-gray-700 dark:text-slate-300 font-medium">
                                                {refStats.friends.map((friend) => (
                                                    <tr key={friend.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                        <td className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">
                                                            {friend.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {friend.status === 'premium' ? (
                                                                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                                                                    <Crown className="w-2.5 h-2.5 fill-amber-500/20 text-amber-500" />
                                                                    PREMIUM
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider">
                                                                    FREE
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-slate-300">
                                                            {friend.rewardIndex !== undefined ? `Bạn thứ ${friend.rewardIndex}` : 'Chưa kích hoạt'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-400">
                                                            {new Date(friend.createdAt).toLocaleDateString('vi-VN')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ==================== GENERAL SETTINGS TAB ==================== */}
            {activeTab === 'general' && (
                <div className="space-y-4">
                    {/* Display Properties */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Type className="w-4 h-4" /> Hiển thị
                        </h3>
                        {/* Furigana Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hiển thị phiên âm (Furigana)</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Cho phép hiển thị cách đọc Hiragana trên chữ Hán.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFuriganaEnabled(!furiganaEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${furiganaEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform`}
                                    style={{ left: furiganaEnabled ? '26px' : '2px' }}
                                />
                            </button>
                        </div>
                        {/* Furigana Settings (Only when enabled) */}
                        {furiganaEnabled && (
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Màu chữ phiên âm</span>
                                        <span className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm" style={{ backgroundColor: furiganaColor }}></span>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Color options */}
                                        {[
                                            { color: '#8b5cf6', name: 'Tím (Mặc định)' },
                                            { color: '#f59e0b', name: 'Vàng/Cam' },
                                            { color: '#3b82f6', name: 'Xanh dương' },
                                            { color: '#ef4444', name: 'Đỏ' },
                                            { color: '#10b981', name: 'Xanh ngọc' },
                                            { color: '#9ca3af', name: 'Xám nhạt' }
                                        ].map((setting) => (
                                            <button
                                                key={setting.color}
                                                onClick={() => setFuriganaColor(setting.color)}
                                                className={`w-8 h-8 rounded-full shadow-sm border-2 flex items-center justify-center transition-transform hover:scale-110 ${furiganaColor === setting.color ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: setting.color }}
                                                title={setting.name}
                                            >
                                                {furiganaColor === setting.color && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kích thước chữ phiên âm</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: '0.5em', label: 'Nhỏ', sample: 'text-xs' },
                                            { value: '0.6em', label: 'Vừa', sample: 'text-sm' },
                                            { value: '0.8em', label: 'Lớn', sample: 'text-base' }
                                        ].map((size) => (
                                            <button
                                                key={size.value}
                                                onClick={() => setFuriganaFontSize(size.value)}
                                                className={`py-2 rounded-xl border transition-colors ${furiganaFontSize === size.value
                                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <span className={`block font-bold ${size.sample}`}>あ</span>
                                                <span className="text-[10px] mt-1">{size.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Sound Effects */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Volume2 className="w-4 h-4" /> Âm thanh
                        </h3>
                        {/* SFX Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {sfxEnabled ? <Volume2 className="w-5 h-5 text-indigo-500" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hiệu ứng âm thanh</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Âm thanh khi trả lời đúng/sai</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSfxEnabled(!sfxEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${sfxEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sfxEnabled ? 'left-6.5 translate-x-0' : 'left-0.5'}`}
                                    style={{ left: sfxEnabled ? '26px' : '2px' }}
                                />
                            </button>
                        </div>
                        {/* SFX Volume */}
                        {sfxEnabled && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Âm lượng hiệu ứng</span>
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.round(sfxVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sfxVolume * 100}
                                    onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        )}

                    </div>
                    {/* TTS Voice Selector */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Mic className="w-4 h-4" /> Giọng đọc tiếng Nhật
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Chọn giọng AI đọc từ vựng tiếng Nhật (SpeechGen.io)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.values(TTS_VOICES).map(voice => (
                                <button
                                    key={voice.id}
                                    onClick={() => {
                                        setTTSVoice(voice.id);
                                        setTtsVoiceState(voice.id);
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${ttsVoice === voice.id
                                        ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 shadow-lg shadow-cyan-100 dark:shadow-cyan-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${voice.gender === 'Female'
                                        ? 'bg-gradient-to-br from-pink-400 to-rose-500'
                                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                        }`}>
                                        <span className="text-xl text-white">{voice.gender === 'Female' ? '👩' : '👨'}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${ttsVoice === voice.id ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {voice.label}
                                    </span>
                                    {ttsVoice === voice.id && <Check className="w-4 h-4 text-cyan-500" />}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setIsPreviewingVoice(true);
                                speakJapanese('こんにちは、私はあなたの日本語の先生です。');
                                setTimeout(() => setIsPreviewingVoice(false), 3000);
                            }}
                            disabled={isPreviewingVoice}
                            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-sm hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isPreviewingVoice ? (
                                <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Đang phát...</>
                            ) : (
                                <><Play className="w-4 h-4" /> Nghe thử giọng đọc</>
                            )}
                        </button>
                    </div>
                    {/* Theme */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Giao diện
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsDarkMode(false)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${!isDarkMode
                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-lg shadow-amber-100 dark:shadow-amber-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-inner">
                                    <Sun className="w-6 h-6 text-white" />
                                </div>
                                <span className={`text-sm font-bold ${!isDarkMode ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>Sáng</span>
                                {!isDarkMode && <Check className="w-4 h-4 text-amber-500" />}
                            </button>
                            <button
                                onClick={() => setIsDarkMode(true)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isDarkMode
                                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-inner">
                                    <Moon className="w-6 h-6 text-white" />
                                </div>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>Tối</span>
                                {isDarkMode && <Check className="w-4 h-4 text-indigo-500" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SettingsScreen;
