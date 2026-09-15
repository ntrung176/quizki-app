import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Settings, User, Volume2, VolumeX, Sun, Moon, ArrowLeft, 
    Save, Check, Shield, Upload, Play, Edit, Type, Camera, 
    Gift, Copy, Crown, Award, Eye, EyeOff, Sparkles, RefreshCw
} from 'lucide-react';
import AvatarCropper from '../ui/AvatarCropper';
import { SafeAvatarImage } from '../ui';
import { ROUTES } from '../../router';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';
import { getSfxVolume, isSfxEnabled } from '../../utils/soundEffects';
import { linkWithPopup, GoogleAuthProvider, unlink } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { showToast } from '../../utils/toast';
import { TTS_VOICES, getTTSVoice, setTTSVoice, speakJapanese } from '../../utils/audio';
import { getReferralStats, submitReferralCode } from '../../utils/referralService';
import { useTargetLanguage } from '../../context/TargetLanguageContext';

const SETTINGS_KEY = 'quizki-settings';
const getSettings = () => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};
const saveSettings = (settings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
};

// 50 clean cartoon animal avatars
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
];

const getAvatarEmoji = (id) => AVATAR_LIST.find(a => a.id === id)?.emoji || '👤';
const isCustomPhoto = (avatarValue) => typeof avatarValue === 'string' && avatarValue.startsWith('data:image/');
const isPhotoUrl = (avatarValue) => typeof avatarValue === 'string' && (avatarValue.startsWith('data:image/') || avatarValue.startsWith('http://') || avatarValue.startsWith('https://'));

// ==================== Settings Screen ====================
const SettingsScreen = ({ 
    profile = null, 
    isDarkMode = false, 
    setIsDarkMode = () => {}, 
    userId = null, 
    onUpdateProfileName = null, 
    onUpdateAvatar = null, 
    onChangePassword = null, 
    isAdmin = false, 
    userProfile = null, 
    onBack = null 
}) => {
    const navigate = useNavigate();
    const { isEnglishMode } = useTargetLanguage();
    const [activeTab, setActiveTab] = useState('account');

    const effectiveProfile = profile || userProfile;
    const effectiveUserId = userId || effectiveProfile?.uid || auth?.currentUser?.uid;

    const isPremiumUser = (effectiveProfile?.unlockedSpecializedPackages && (
        effectiveProfile.unlockedSpecializedPackages.includes('premium') ||
        effectiveProfile.unlockedSpecializedPackages.includes('premium_1m') ||
        effectiveProfile.unlockedSpecializedPackages.includes('premium_1y') ||
        effectiveProfile.unlockedSpecializedPackages.includes('premium_3y') ||
        effectiveProfile.unlockedSpecializedPackages.includes('vocab_zen') ||
        effectiveProfile.unlockedSpecializedPackages.includes('grammar_zen') ||
        effectiveProfile.unlockedSpecializedPackages.includes('kanji_zen') ||
        effectiveProfile.unlockedSpecializedPackages.includes('jlpt_prep')
    )) || false;

    const hasPremium = (
        effectiveProfile?.isPremiumUnlocked === true ||
        effectiveProfile?.isPremium === true ||
        isPremiumUser ||
        (effectiveProfile?.premiumExpiresAt && (() => {
            try {
                const exp = effectiveProfile.premiumExpiresAt.toDate ? effectiveProfile.premiumExpiresAt.toDate() : new Date(effectiveProfile.premiumExpiresAt);
                return exp > new Date();
            } catch (e) {
                return false;
            }
        })())
    ) || false;

    const getActivePackageName = () => {
        if (!hasPremium) return 'Thành viên Miễn phí';
        const packages = effectiveProfile?.unlockedSpecializedPackages || [];
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

    // XP calculation
    const xpDetails = useMemo(() => {
        const xp = Math.max(
            Number(effectiveProfile?.xp || 0),
            Number(effectiveProfile?.score || 0),
            Number(effectiveProfile?.totalXp || 0)
        );
        return getLevelFromXp(xp);
    }, [effectiveProfile?.xp, effectiveProfile?.score, effectiveProfile?.totalXp]);

    // Profile Edit state
    const [displayName, setDisplayName] = useState(effectiveProfile?.displayName || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Avatar state
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showAvatarCropper, setShowAvatarCropper] = useState(false);
    const [avatarTab, setAvatarTab] = useState('emoji'); // 'emoji' | 'photo'

    // Linked providers state
    const [linkedProviders, setLinkedProviders] = useState([]);
    const [isLinking, setIsLinking] = useState(false);

    // Referral States
    const [refStats, setRefStats] = useState({ totalInvited: 0, premiumInvited: 0, friends: [] });
    const [loadingStats, setLoadingStats] = useState(true);
    const [enteredCode, setEnteredCode] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedRaw, setCopiedRaw] = useState(false);

    // General Settings State
    const cloudSettings = effectiveProfile?.appSettings || {};
    const localSettings = getSettings();

    const [sfxVolume, setSfxVolume] = useState(() => {
        if (cloudSettings.sfxVolume !== undefined) return cloudSettings.sfxVolume;
        return getSfxVolume();
    });
    const [sfxEnabled, setSfxEnabled] = useState(() => {
        if (cloudSettings.sfxEnabled !== undefined) return cloudSettings.sfxEnabled;
        return isSfxEnabled();
    });
    const [furiganaColor, setFuriganaColor] = useState(() => {
        return cloudSettings.furiganaColor || localSettings.furiganaColor || '#2563eb';
    });
    const [furiganaFontSize, setFuriganaFontSize] = useState(() => {
        return cloudSettings.furiganaFontSize || localSettings.furiganaFontSize || '0.6em';
    });
    const [ttsVoice, setTtsVoiceState] = useState(() => {
        return cloudSettings.ttsVoice || getTTSVoice();
    });
    const [ttsSpeed, setTtsSpeed] = useState(() => {
        if (cloudSettings.ttsSpeed !== undefined) return cloudSettings.ttsSpeed;
        return localSettings.ttsSpeed !== undefined ? localSettings.ttsSpeed : 1.0;
    });
    const [ttsVolume, setTtsVolume] = useState(() => {
        return cloudSettings.ttsVolume || localSettings.ttsVolume || 'default';
    });
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Synchronize initial name when profile loads
    useEffect(() => {
        if (effectiveProfile?.displayName) {
            setDisplayName(effectiveProfile.displayName);
        }
    }, [effectiveProfile?.displayName]);

    // Check linked providers
    useEffect(() => {
        if (auth?.currentUser) {
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
        }
    }, [auth?.currentUser, auth?.currentUser?.providerData]);

    // Fetch referral statistics
    useEffect(() => {
        if (!effectiveUserId) return;
        const fetchStats = async () => {
            try {
                const stats = await getReferralStats(effectiveUserId);
                setRefStats(stats);
            } catch (e) {
                console.error('Lỗi tải thống kê giới thiệu:', e);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [effectiveUserId]);

    // Handle Save Profile Display Name
    const handleSaveProfile = async () => {
        if (!displayName.trim()) return;
        setIsSavingName(true);
        try {
            if (onUpdateProfileName) {
                await onUpdateProfileName(displayName.trim());
            }
            showToast('Đã cập nhật tên hiển thị thành công!', 'success');
            setIsEditingName(false);
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'error');
        } finally {
            setIsSavingName(false);
        }
    };

    // Handle select avatar
    const handleSelectAvatar = async (avatarValue) => {
        if (!onUpdateAvatar) return;
        try {
            await onUpdateAvatar(avatarValue);
            setShowAvatarPicker(false);
            setShowAvatarCropper(false);
            showToast('Đã cập nhật ảnh đại diện!', 'success');
        } catch (e) {
            showToast('Lỗi: ' + e.message, 'error');
        }
    };

    // Handle change password
    const handleChangePassword = async () => {
        if (linkedProviders.includes('password') && !oldPassword) {
            showToast('Vui lòng nhập mật khẩu hiện tại', 'warning');
            return;
        }
        if (newPassword.length < 6) {
            showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp', 'error');
            return;
        }
        setIsSavingPassword(true);
        try {
            await onChangePassword(oldPassword, newPassword);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            const hasPassword = linkedProviders.includes('password');
            showToast(hasPassword ? 'Đã đổi mật khẩu thành công!' : 'Đã tạo mật khẩu thành công!', 'success');
        } catch (e) {
            console.error('Lỗi đổi mật khẩu:', e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                showToast('Mật khẩu hiện tại không đúng.', 'error');
            } else if (e.code === 'auth/requires-recent-login') {
                showToast('Vì lý do bảo mật, bạn cần đăng xuất và đăng nhập lại trước khi tạo/đổi mật khẩu.', 'warning');
            } else {
                showToast('Lỗi: ' + (e.message || 'Không thể đổi mật khẩu'), 'error');
            }
        } finally {
            setIsSavingPassword(false);
        }
    };

    // Handle Link Google
    const handleLinkGoogle = async () => {
        if (!auth?.currentUser) return;
        setIsLinking(true);
        try {
            const provider = new GoogleAuthProvider();
            await linkWithPopup(auth.currentUser, provider);
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
            showToast('Đã liên kết tài khoản Google thành công!', 'success');
        } catch (e) {
            console.error('Lỗi liên kết:', e);
            if (e.code === 'auth/credential-already-in-use') {
                showToast('Tài khoản Google này đã gắn với người dùng khác.', 'error');
            } else {
                showToast('Lỗi liên kết: ' + e.message, 'error');
            }
        } finally {
            setIsLinking(false);
        }
    };

    // Handle Unlink Google
    const handleUnlinkGoogle = async () => {
        if (!auth?.currentUser) return;
        if (linkedProviders.length <= 1) {
            showToast('Không thể hủy liên kết phương thức đăng nhập duy nhất.', 'warning');
            return;
        }
        setIsLinking(true);
        try {
            await unlink(auth.currentUser, 'google.com');
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
            showToast('Đã hủy liên kết tài khoản Google.', 'success');
        } catch (e) {
            console.error('Lỗi hủy liên kết:', e);
            showToast('Lỗi: ' + e.message, 'error');
        } finally {
            setIsLinking(false);
        }
    };

    // Referral Handlers
    const handleCopyRawCode = () => {
        const code = effectiveProfile?.referralCode || '';
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2000);
    };

    const handleApplyReferral = async () => {
        if (!enteredCode.trim() || !effectiveUserId) return;
        setSubmitLoading(true);
        try {
            const res = await submitReferralCode(effectiveUserId, effectiveProfile?.displayName || 'Người dùng', enteredCode.trim());
            if (res.success) {
                showToast('Áp dụng mã giới thiệu thành công! Bạn nhận được 1 tháng Premium.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(res.error || 'Mã không hợp lệ hoặc đã xảy ra lỗi.', 'error');
            }
        } catch (e) {
            showToast(e.message || 'Mã không hợp lệ hoặc đã xảy ra lỗi.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    // Save & Cloud Sync General Settings
    const handleSaveGeneralSettings = async () => {
        setIsSavingSettings(true);
        try {
            const settingsObj = {
                furiganaColor,
                furiganaFontSize,
                sfxEnabled,
                sfxVolume,
                ttsVoice,
                ttsSpeed,
                ttsVolume,
                isDarkMode
            };

            // 1. Save locally
            saveSettings(settingsObj);
            setTTSVoice(ttsVoice);
            localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
            if (furiganaColor) {
                document.documentElement.style.setProperty('--furigana-color', furiganaColor);
            }
            if (furiganaFontSize) {
                document.documentElement.style.setProperty('--furigana-font-size', furiganaFontSize);
            }
            window.dispatchEvent(new Event('quizki-settings-changed'));

            // 2. Sync to Firestore for web and mobile shared usage
            if (effectiveUserId && db && appId) {
                const profileRef = doc(db, `artifacts/${appId}/users/${effectiveUserId}/settings/profile`);
                await setDoc(profileRef, {
                    appSettings: settingsObj,
                    updatedAt: Date.now()
                }, { merge: true });
            }

            setSaveSuccess(true);
            showToast('Đã lưu và đồng bộ cài đặt thành công!', 'success');
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err) {
            console.error('Lỗi khi lưu cài đặt:', err);
            showToast('Lỗi khi đồng bộ cài đặt: ' + (err.message || 'Không thể lưu'), 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const getAvatarDisplay = (avatarValue) => {
        const fallbackChar = (
            <span className="text-3xl font-black text-slate-700 dark:text-slate-200">
                {effectiveProfile?.displayName ? effectiveProfile.displayName.charAt(0).toUpperCase() : '👤'}
            </span>
        );

        if (isPhotoUrl(avatarValue)) {
            return (
                <SafeAvatarImage
                    src={avatarValue}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    fallback={fallbackChar}
                />
            );
        }
        if (avatarValue === 'default' || !avatarValue) {
            if (auth?.currentUser?.photoURL) {
                return (
                    <SafeAvatarImage
                        src={auth.currentUser.photoURL}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        fallback={fallbackChar}
                    />
                );
            }
            return fallbackChar;
        }
        return <span className="text-4xl leading-none">{getAvatarEmoji(avatarValue)}</span>;
    };

    const tabs = [
        { id: 'account', label: 'Tài khoản', icon: User },
        { id: 'referral', label: 'Giới thiệu bạn bè', icon: Gift },
        { id: 'general', label: 'Cài đặt chung', icon: Settings },
    ];

    return (
        <div className="w-full space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-4">
                <Link
                    to={ROUTES.HOME}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        Cài đặt
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        Quản lý tài khoản, giới thiệu bạn bè và tùy chỉnh ứng dụng
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 gap-1 border border-slate-200/50 dark:border-slate-700/50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ==================== TAB 1: TÀI KHOẢN (ACCOUNT) ==================== */}
            {activeTab === 'account' && (
                <div className="space-y-5">
                    {/* Hồ sơ & Gói học tập */}
                    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Cột trái: Avatar & Thông tin */}
                            <div className="lg:col-span-7 flex flex-col sm:flex-row gap-5 items-start">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                    <div className="relative group">
                                        <div
                                            className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 transition-all"
                                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                            title="Thay đổi ảnh đại diện"
                                        >
                                            {getAvatarDisplay(effectiveProfile?.avatar)}
                                        </div>
                                        <button
                                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                            className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow transition-all cursor-pointer ring-2 ring-white dark:ring-slate-800"
                                            title="Đổi avatar"
                                        >
                                            <Camera className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Nút chọn Avatar */}
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <button
                                            onClick={() => { setShowAvatarPicker(!showAvatarPicker); setAvatarTab('emoji'); }}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                                        >
                                            Emoji
                                        </button>
                                        <button
                                            onClick={() => setShowAvatarCropper(true)}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                                        >
                                            Tải ảnh
                                        </button>
                                    </div>
                                </div>

                                {/* Thông tin người dùng */}
                                <div className="flex-1 space-y-3 w-full">
                                    <div>
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <input
                                                    type="text"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveProfile();
                                                        if (e.key === 'Escape') setIsEditingName(false);
                                                    }}
                                                    placeholder="Nhập tên hiển thị..."
                                                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-blue-400 dark:border-blue-500 rounded-lg text-slate-900 dark:text-white text-sm font-bold outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveProfile}
                                                    disabled={isSavingName || !displayName.trim()}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                                >
                                                    {isSavingName ? '...' : 'Lưu'}
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingName(false)}
                                                    className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-black text-slate-900 dark:text-white text-xl">
                                                    {effectiveProfile?.displayName || 'Chưa đặt tên'}
                                                </h3>
                                                <button
                                                    onClick={() => {
                                                        setDisplayName(effectiveProfile?.displayName || '');
                                                        setIsEditingName(true);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                                    title="Đổi tên"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}

                                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                                            {effectiveProfile?.email || auth?.currentUser?.email || 'Không có email'}
                                        </p>
                                    </div>

                                    {/* Cấp độ & Thanh tiến trình XP */}
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                                                Lv. {xpDetails.level} • {getLevelTitle(xpDetails.level)}
                                            </span>
                                            <span className="text-slate-400 font-mono text-[11px]">
                                                {xpDetails.remainingXp.toLocaleString()} / {xpDetails.nextLevelXp.toLocaleString()} XP
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, Math.round((xpDetails.remainingXp / xpDetails.nextLevelXp) * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cột phải: Gói học tập */}
                            <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Gói học tập
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            hasPremium 
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                            {hasPremium ? 'PREMIUM' : 'FREE'}
                                        </span>
                                    </div>

                                    <div className="font-extrabold text-base text-slate-800 dark:text-white">
                                        {getActivePackageName()}
                                    </div>

                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {hasPremium ? (
                                            <div>
                                                Hạn dùng: <strong className="text-slate-700 dark:text-slate-200">
                                                    {effectiveProfile?.premiumExpiresAt ? (
                                                        (() => {
                                                             const date = effectiveProfile.premiumExpiresAt.toDate ? effectiveProfile.premiumExpiresAt.toDate() : new Date(effectiveProfile.premiumExpiresAt);
                                                             return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                        })()
                                                    ) : 'Vĩnh viễn'}
                                                </strong>
                                            </div>
                                        ) : (
                                            <span>Mở khóa không giới hạn tính năng AI và bài học Zen.</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(ROUTES.UPGRADE)}
                                    className="w-full py-2.5 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Crown className="w-3.5 h-3.5 fill-white text-white" />
                                    <span>{hasPremium ? 'Gia hạn / Quản lý gói' : 'Nâng cấp Premium ngay'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Avatar Picker popdown */}
                        {showAvatarPicker && (
                            <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4 space-y-3">
                                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 gap-1 max-w-xs">
                                    <button
                                        onClick={() => setAvatarTab('emoji')}
                                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${avatarTab === 'emoji' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}
                                    >
                                        Emoji
                                    </button>
                                    <button
                                        onClick={() => setAvatarTab('photo')}
                                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${avatarTab === 'photo' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}
                                    >
                                        Ảnh của bạn
                                    </button>
                                </div>

                                {avatarTab === 'emoji' && (
                                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-56 overflow-y-auto p-1">
                                        {AVATAR_LIST.map(avatar => {
                                            const isActive = effectiveProfile?.avatar === avatar.id || (!effectiveProfile?.avatar && avatar.id === 'default');
                                            return (
                                                <button
                                                    key={avatar.id}
                                                    onClick={() => handleSelectAvatar(avatar.id)}
                                                    className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${
                                                        isActive
                                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500'
                                                            : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                                    }`}
                                                    title={avatar.name}
                                                >
                                                    <span className="text-2xl">{avatar.emoji}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {avatarTab === 'photo' && (
                                    <div className="space-y-3 max-w-sm">
                                        <button
                                            onClick={() => { setShowAvatarPicker(false); setShowAvatarCropper(true); }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold transition-colors cursor-pointer"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Tải ảnh mới từ thiết bị
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Avatar Cropper Modal */}
                    {showAvatarCropper && (
                        <AvatarCropper
                            onConfirm={async (base64) => {
                                await handleSelectAvatar(base64);
                            }}
                            onCancel={() => setShowAvatarCropper(false)}
                            currentAvatarUrl={isCustomPhoto(effectiveProfile?.avatar) ? effectiveProfile.avatar : null}
                        />
                    )}

                    {/* Đổi mật khẩu */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500" />
                            {linkedProviders.includes('password') ? 'Đổi mật khẩu' : 'Tạo mật khẩu đăng nhập'}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {linkedProviders.includes('password') && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Mật khẩu hiện tại
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showOldPassword ? 'text' : 'password'}
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="w-full px-3.5 py-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400"
                                            placeholder="Nhập mật khẩu hiện tại"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                        >
                                            {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Mật khẩu mới
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3.5 py-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400"
                                        placeholder="Ít nhất 6 ký tự"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Xác nhận mật khẩu
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3.5 py-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400"
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleChangePassword}
                                disabled={isSavingPassword || !newPassword || !confirmPassword}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                            >
                                {isSavingPassword ? 'Đang lưu...' : (linkedProviders.includes('password') ? 'Cập nhật mật khẩu' : 'Tạo mật khẩu')}
                            </button>
                        </div>
                    </div>

                    {/* Tài khoản liên kết */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                            Tài khoản liên kết
                        </h3>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Google</p>
                                    <p className="text-[11px] text-slate-400">
                                        {linkedProviders.includes('google.com') ? 'Đã liên kết đăng nhập 1-chạm' : 'Chưa liên kết'}
                                    </p>
                                </div>
                            </div>

                            {linkedProviders.includes('google.com') ? (
                                <button
                                    onClick={handleUnlinkGoogle}
                                    disabled={isLinking || linkedProviders.length <= 1}
                                    className="px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                    Hủy liên kết
                                </button>
                            ) : (
                                <button
                                    onClick={handleLinkGoogle}
                                    disabled={isLinking}
                                    className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                    {isLinking ? '...' : 'Liên kết ngay'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== TAB 2: GIỚI THIỆU BẠN BÈ (REFERRAL) ==================== */}
            {activeTab === 'referral' && (
                <div className="space-y-5">
                    {/* Header info */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Gift className="w-5 h-5 text-blue-500" />
                                Giới thiệu bạn bè nhận ngày Premium
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                                Người nhập mã nhận ngay <strong>+1 tháng Premium</strong>. Bạn nhận thưởng tích lũy: bạn 1 & 2 nhận <strong>+15 ngày</strong>, bạn 3 nhận <strong>+20 ngày</strong>, từ bạn 4+ nhận <strong>+1 tháng/bạn</strong>.
                            </p>
                        </div>

                        {/* 3 Panels Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Panel 1: Mã giới thiệu của bạn */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        Mã giới thiệu của bạn
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                        Mỗi mã có thể dùng cho nhiều bạn bè.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                                    <span className="text-base font-black font-mono tracking-wider text-blue-600 dark:text-blue-400">
                                        {effectiveProfile?.referralCode || '...'}
                                    </span>
                                    <button
                                        onClick={handleCopyRawCode}
                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 active:scale-95 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Sao chép mã"
                                    >
                                        {copiedRaw ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400">Đã chép</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Sao chép</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Panel 2: Nhập mã bạn bè */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        Nhập mã bạn bè
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                        Mỗi tài khoản chỉ có 1 người giới thiệu.
                                    </p>
                                </div>

                                {effectiveProfile?.referredBy ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <p className="font-bold text-emerald-700 dark:text-emerald-300">Đã liên kết người giới thiệu</p>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 text-[11px] pl-5.5">
                                            Bởi: <strong>{effectiveProfile.referredBy.name}</strong> ({effectiveProfile.referredBy.code})
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Mã ví dụ: QKXXXXXX"
                                                value={enteredCode}
                                                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                                                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 font-mono font-bold uppercase"
                                            />
                                            <button
                                                onClick={handleApplyReferral}
                                                disabled={submitLoading || !enteredCode.trim()}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                            >
                                                {submitLoading ? '...' : 'Gửi mã'}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400">Nhận ngay +1 tháng Premium khi nhập mã.</p>
                                    </div>
                                )}
                            </div>

                            {/* Panel 3: Thống kê */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        Thống kê giới thiệu
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                        Số lượng bạn bè đã nhập mã của bạn.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                        <span className="text-[10px] text-slate-400 block font-semibold">Đã mời</span>
                                        <span className="text-lg font-black text-slate-900 dark:text-white">
                                            {loadingStats ? '...' : refStats.totalInvited}
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                        <span className="text-[10px] text-amber-500 block font-semibold">Premium</span>
                                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                            {loadingStats ? '...' : refStats.premiumInvited}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bản đồ phần thưởng lũy tiến */}
                        <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4 space-y-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Thưởng lũy tiến theo số lượt bạn bè giới thiệu:
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { step: 1, label: 'Bạn thứ 1', bonus: '+15 ngày' },
                                    { step: 2, label: 'Bạn thứ 2', bonus: '+15 ngày' },
                                    { step: 3, label: 'Bạn thứ 3', bonus: '+20 ngày' },
                                    { step: 4, label: 'Bạn thứ 4+', bonus: '+1 tháng/bạn' }
                                ].map((milestone) => {
                                    const isAchieved = refStats.totalInvited >= milestone.step;
                                    const isNext = refStats.totalInvited === milestone.step - 1;

                                    return (
                                        <div
                                            key={milestone.step}
                                            className={`p-3 rounded-xl border text-center transition-all ${
                                                isAchieved
                                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                                    : isNext
                                                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                                    : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-400'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold block uppercase">{milestone.label}</span>
                                            <span className="text-sm font-black mt-0.5 block">{milestone.bonus}</span>
                                            <span className="text-[9px] mt-1 block font-semibold opacity-80">
                                                {isAchieved ? '✓ Đã nhận' : isNext ? 'Kế tiếp' : 'Chưa đạt'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Lịch sử giới thiệu */}
                        <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4 space-y-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Danh sách bạn bè đã mời
                            </span>

                            {loadingStats ? (
                                <div className="text-center py-4 text-xs text-slate-400">Đang tải...</div>
                            ) : refStats.friends.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400">
                                    Chưa có bạn bè nào nhập mã giới thiệu của bạn.
                                </div>
                            ) : (
                                <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-700 text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase text-slate-400">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left">Tên bạn bè</th>
                                                <th className="px-4 py-2.5 text-center">Gói</th>
                                                <th className="px-4 py-2.5 text-right">Ngày tham gia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                            {refStats.friends.map((friend) => (
                                                <tr key={friend.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                                                    <td className="px-4 py-2.5 text-left font-semibold">{friend.name}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                            friend.status === 'premium' 
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' 
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {friend.status === 'premium' ? 'Premium' : 'Free'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-slate-400 text-[11px]">
                                                        {new Date(friend.createdAt).toLocaleDateString('vi-VN')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== TAB 3: CÀI ĐẶT CHUNG (GENERAL SETTINGS) ==================== */}
            {activeTab === 'general' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/80">
                        {/* 1. Hiển thị phiên âm (Furigana) */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Type className="w-4 h-4 text-blue-500" />
                                    Phiên âm chữ Hán (Furigana)
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tùy chỉnh màu sắc và kích thước chữ phiên âm hiển thị đồng bộ trên toàn hệ thống
                                </p>
                            </div>

                            <div className="pt-2 space-y-4">
                                {/* Màu sắc */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Màu chữ phiên âm
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {[
                                            { color: '#2563eb', name: 'Xanh dương' },
                                            { color: '#0284c7', name: 'Xanh biển' },
                                            { color: '#059669', name: 'Xanh lá' },
                                            { color: '#d97706', name: 'Cam' },
                                            { color: '#dc2626', name: 'Đỏ' },
                                            { color: '#4b5563', name: 'Xám chì' }
                                        ].map((setting) => (
                                            <button
                                                key={setting.color}
                                                type="button"
                                                onClick={() => setFuriganaColor(setting.color)}
                                                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                                                    furiganaColor === setting.color ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''
                                                }`}
                                                style={{ backgroundColor: setting.color }}
                                                title={setting.name}
                                            >
                                                {furiganaColor === setting.color && <Check className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Kích thước */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Kích thước chữ phiên âm
                                    </span>
                                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 gap-1">
                                        {[
                                            { value: '0.5em', label: 'Nhỏ' },
                                            { value: '0.6em', label: 'Vừa' },
                                            { value: '0.8em', label: 'Lớn' }
                                        ].map((size) => (
                                            <button
                                                key={size.value}
                                                type="button"
                                                onClick={() => setFuriganaFontSize(size.value)}
                                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                                    furiganaFontSize === size.value
                                                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {size.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Xem trước trực tiếp */}
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Xem trước hiển thị:</span>
                                    <div className="text-base font-bold text-slate-800 dark:text-white font-japanese">
                                        <ruby style={{ rubyPosition: 'over', lineHeight: '2.4' }}>
                                            日本語
                                            <rt style={{ fontSize: furiganaFontSize, color: furiganaColor, paddingBottom: '3px' }}>にほんご</rt>
                                        </ruby>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Âm thanh hiệu ứng */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-blue-500" />
                                        Hiệu ứng âm thanh
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Phát âm thanh thông báo khi trả lời Đúng hoặc Sai trong bài học
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSfxEnabled(!sfxEnabled)}
                                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                                        sfxEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                                >
                                    <span 
                                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                            sfxEnabled ? 'left-5.5' : 'left-0.5'
                                        }`}
                                    />
                                </button>
                            </div>

                            {sfxEnabled && (
                                <div className="pt-2 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-semibold">Âm lượng hiệu ứng</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">{Math.round(sfxVolume * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={sfxVolume * 100}
                                        onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. Giọng đọc phát âm AI */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Play className="w-4 h-4 text-blue-500" />
                                    Giọng đọc phát âm AI
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Chọn giọng đọc mẫu phát âm cho từ vựng và câu ví dụ
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {Object.values(TTS_VOICES).map(voice => (
                                    <button
                                        key={voice.id}
                                        onClick={() => {
                                            setTtsVoiceState(voice.id);
                                        }}
                                        className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                                            ttsVoice === voice.id
                                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-xs'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{voice.gender === 'Female' ? '👩' : '👨'}</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                                Giọng {voice.label}
                                            </span>
                                        </div>
                                        {ttsVoice === voice.id && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    setIsPreviewingVoice(true);
                                    setTTSVoice(ttsVoice);
                                    speakJapanese(isEnglishMode ? 'Hello, this is your pronunciation assistant.' : 'こんにちは、こちらは音声テストです。');
                                    setTimeout(() => setIsPreviewingVoice(false), 2500);
                                }}
                                disabled={isPreviewingVoice}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-98 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                            >
                                {isPreviewingVoice ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <span>Đang phát thử...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3.5 h-3.5" />
                                        <span>Nghe thử giọng đọc</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 4. Chủ đề giao diện */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-blue-500" />
                                    Chủ đề giao diện
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tùy chỉnh chế độ hiển thị sáng hoặc tối
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsDarkMode(false)}
                                    className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                                        !isDarkMode
                                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Sun className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">Giao diện Sáng</span>
                                    </div>
                                    {!isDarkMode && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                </button>

                                <button
                                    onClick={() => setIsDarkMode(true)}
                                    className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                                        isDarkMode
                                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Moon className="w-4 h-4 text-sky-400" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">Giao diện Tối</span>
                                    </div>
                                    {isDarkMode && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Nút LƯU CÀI ĐẶT (ĐỒNG BỘ WEB & MOBILE) */}
                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={handleSaveGeneralSettings}
                            disabled={isSavingSettings}
                            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSavingSettings ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang lưu và đồng bộ...</span>
                                </>
                            ) : saveSuccess ? (
                                <>
                                    <Check className="w-4 h-4 text-emerald-300" />
                                    <span>Đã lưu cài đặt!</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Lưu cài đặt</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;
