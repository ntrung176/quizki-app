import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Settings, User, Volume2, VolumeX, Sun, Moon, ArrowLeft, 
    Save, Check, Shield, Upload, Play, Edit, Type, Camera, 
    Gift, Copy, Crown, Award, Eye, EyeOff, RefreshCw, Zap,
    Palette, Sliders
} from 'lucide-react';
import { useAppBackground, BG_THEME_LIST } from '../../hooks/useAppBackground';
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
import { useLanguage } from '../../context/LanguageContext';

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
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState('account');

    const effectiveProfile = profile || userProfile;
    const effectiveUserId = userId || effectiveProfile?.uid || auth?.currentUser?.uid;
    const { bgTheme, isAnimated, setBgTheme, setIsAnimated } = useAppBackground();

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
        if (!hasPremium) return t('settings.membership.free', 'Thành viên Miễn phí');
        const packages = effectiveProfile?.unlockedSpecializedPackages || [];
        if (packages.includes('premium_3y')) return t('settings.membership.premium3y', 'Premium 3 Năm');
        if (packages.includes('premium_1y')) return t('settings.membership.premium1y', 'Premium 1 Năm');
        if (packages.includes('premium_1m')) return t('settings.membership.premium1m', 'Premium 1 Tháng');
        if (packages.includes('premium')) return 'Premium';
        
        const zenPkgs = [];
        if (packages.includes('vocab_zen')) zenPkgs.push(t('settings.membership.vocabZen', 'Từ vựng Zen'));
        if (packages.includes('grammar_zen')) zenPkgs.push(t('settings.membership.grammarZen', 'Ngữ pháp Zen'));
        if (packages.includes('kanji_zen')) zenPkgs.push(t('settings.membership.kanjiZen', 'Kanji Zen'));
        if (packages.includes('jlpt_prep')) zenPkgs.push(t('settings.membership.jlptPrep', 'Luyện thi JLPT'));
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
    const [learnAheadLimit, setLearnAheadLimit] = useState(() => {
        if (cloudSettings.learnAheadLimit !== undefined) return Number(cloudSettings.learnAheadLimit);
        try {
            const saved = localStorage.getItem('quizki_learn_ahead_limit');
            return saved !== null ? Number(saved) : 20;
        } catch (_) { return 20; }
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
            showToast(hasPassword ? t('settings.account.passwordChangedSuccess') : t('settings.account.passwordCreatedSuccess'), 'success');
        } catch (e) {
            console.error('Lỗi đổi mật khẩu:', e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                showToast(t('settings.account.wrongPassword', { defaultValue: 'Current password is incorrect.' }), 'error');
            } else if (e.code === 'auth/requires-recent-login') {
                showToast(t('settings.account.requiresRecentLogin', { defaultValue: 'For security reasons, please log out and log back in before updating password.' }), 'warning');
            } else {
                showToast(e.message || t('common.error'), 'error');
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
            showToast(t('settings.account.linkedSuccess'), 'success');
        } catch (e) {
            console.error('Lỗi liên kết:', e);
            if (e.code === 'auth/credential-already-in-use') {
                showToast(t('settings.account.credentialInUse', { defaultValue: 'This Google account is already linked to another user.' }), 'error');
            } else {
                showToast(e.message || t('common.error'), 'error');
            }
        } finally {
            setIsLinking(false);
        }
    };

    // Handle Unlink Google
    const handleUnlinkGoogle = async () => {
        if (!auth?.currentUser) return;
        if (linkedProviders.length <= 1) {
            showToast(t('settings.account.cannotUnlinkOnlyProvider', { defaultValue: 'Cannot unlink your only sign-in method.' }), 'warning');
            return;
        }
        setIsLinking(true);
        try {
            await unlink(auth.currentUser, 'google.com');
            setLinkedProviders(auth.currentUser.providerData.map(p => p.providerId));
            showToast(t('settings.account.unlinkedSuccess'), 'success');
        } catch (e) {
            console.error('Lỗi hủy liên kết:', e);
            showToast(e.message || t('common.error'), 'error');
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
            const res = await submitReferralCode(effectiveUserId, effectiveProfile?.displayName || (language === 'vi' ? 'Người dùng' : 'User'), enteredCode.trim());
            if (res.success) {
                showToast(language === 'vi' ? 'Áp dụng mã giới thiệu thành công! Bạn nhận được 1 tháng Premium.' : 'Referral code applied successfully! +1 Month Premium added.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(res.error || (language === 'vi' ? 'Mã không hợp lệ hoặc đã xảy ra lỗi.' : 'Invalid referral code or an error occurred.'), 'error');
            }
        } catch (e) {
            showToast(e.message || (language === 'vi' ? 'Mã không hợp lệ hoặc đã xảy ra lỗi.' : 'Invalid referral code or an error occurred.'), 'error');
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
                isDarkMode,
                learnAheadLimit
            };

            // 1. Save locally
            saveSettings(settingsObj);
            setTTSVoice(ttsVoice);
            localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
            localStorage.setItem('quizki_learn_ahead_limit', String(learnAheadLimit));
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
            showToast(language === 'vi' ? 'Đã lưu và đồng bộ cài đặt thành công!' : 'Settings saved and synced successfully!', 'success');
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err) {
            console.error('Lỗi khi lưu cài đặt:', err);
            showToast((language === 'vi' ? 'Lỗi khi đồng bộ cài đặt: ' : 'Error syncing settings: ') + (err.message || ''), 'error');
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
        { id: 'account', label: t('settings.tabs.account', 'Tài khoản'), icon: User },
        { id: 'referral', label: t('settings.tabs.referral', 'Giới thiệu bạn bè'), icon: Gift },
        { id: 'general', label: t('settings.tabs.general', 'Cài đặt chung'), icon: Settings },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
            {/* Top Navigation Bar: Back button + 3 Tabs */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
                <Link
                    to={ROUTES.HOME}
                    className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-all active:translate-y-0.5 border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 active:border-b-2 shrink-0 flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 shadow-xs cursor-pointer select-none"
                    title={t('common.back', 'Quay lại')}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                <div className="flex-1 flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1.5 gap-1.5 border-2 border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 border-2 border-sky-400/50 border-b-4 border-b-sky-500 shadow-sm active:translate-y-0.5 active:border-b-2'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 border-2 border-transparent'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span className="truncate">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ==================== TAB 1: TÀI KHOẢN (ACCOUNT) ==================== */}
            {activeTab === 'account' && (
                <div className="space-y-5">
                    {/* Hồ sơ & Gói học tập */}
                    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Cột trái: Avatar & Thông tin */}
                            <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start text-center sm:text-left">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                    <div className="relative group">
                                        <div
                                            className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 transition-all"
                                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                            title={t('settings.account.changeAvatar')}
                                        >
                                            {getAvatarDisplay(effectiveProfile?.avatar)}
                                        </div>
                                        <button
                                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                            className="absolute -bottom-1 -right-1 w-7 h-7 bg-sky-500 hover:bg-sky-600 active:translate-y-0.5 border-2 border-sky-600 border-b-4 border-b-sky-700 active:border-b-2 text-white rounded-full flex items-center justify-center shadow transition-all cursor-pointer ring-2 ring-white dark:ring-slate-800"
                                            title={t('settings.account.changeAvatar')}
                                        >
                                            <Camera className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Nút chọn Avatar */}
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <button
                                            onClick={() => { setShowAvatarPicker(!showAvatarPicker); setAvatarTab('emoji'); }}
                                            className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 border-b-4 border-b-slate-300 dark:border-b-slate-800 active:translate-y-0.5 active:border-b-2 rounded-xl text-[11px] font-black transition-all cursor-pointer select-none"
                                        >
                                            Emoji
                                        </button>
                                        <button
                                            onClick={() => setShowAvatarCropper(true)}
                                            className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 border-b-4 border-b-slate-300 dark:border-b-slate-800 active:translate-y-0.5 active:border-b-2 rounded-xl text-[11px] font-black transition-all cursor-pointer select-none"
                                        >
                                            {t('settings.account.uploadPhoto')}
                                        </button>
                                    </div>
                                </div>

                                {/* Thông tin người dùng */}
                                <div className="flex-1 space-y-3 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                                    <div className="w-full flex flex-col items-center sm:items-start">
                                        {isEditingName ? (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5 w-full max-w-sm">
                                                <input
                                                    type="text"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveProfile();
                                                        if (e.key === 'Escape') setIsEditingName(false);
                                                    }}
                                                    placeholder={t('settings.account.namePlaceholder')}
                                                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-2 border-sky-400 dark:border-sky-500 rounded-xl text-slate-900 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveProfile}
                                                    disabled={isSavingName || !displayName.trim()}
                                                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:translate-y-0.5 border-2 border-emerald-600 border-b-4 border-b-emerald-700 active:border-b-2 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 cursor-pointer select-none"
                                                >
                                                    {isSavingName ? '...' : t('settings.account.saveName')}
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingName(false)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:translate-y-0.5 border-2 border-slate-200 dark:border-slate-600 border-b-4 border-b-slate-300 dark:border-b-slate-800 active:border-b-2 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all select-none"
                                                >
                                                    {t('settings.account.cancel')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                                                <h3 className="font-black text-slate-900 dark:text-white text-xl">
                                                    {effectiveProfile?.displayName || t('settings.account.noName')}
                                                </h3>
                                                <button
                                                    onClick={() => {
                                                        setDisplayName(effectiveProfile?.displayName || '');
                                                        setIsEditingName(true);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                                                    title={t('settings.account.editName')}
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}

                                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                                            {effectiveProfile?.email || auth?.currentUser?.email || t('settings.account.noEmail')}
                                        </p>
                                    </div>

                                    {/* Cấp độ & Thanh tiến trình XP */}
                                    <div className="space-y-1.5 pt-1 w-full max-w-sm sm:max-w-none">
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-sky-600 dark:text-sky-400 font-black">
                                                Lv. {xpDetails.level} • {getLevelTitle(xpDetails.level, t)}
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
                                            {t('settings.membership.status')}
                                        </span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
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
                                                {t('settings.membership.expiresOn')}: <strong className="text-slate-700 dark:text-slate-200">
                                                    {effectiveProfile?.premiumExpiresAt ? (
                                                        (() => {
                                                             const date = effectiveProfile.premiumExpiresAt.toDate ? effectiveProfile.premiumExpiresAt.toDate() : new Date(effectiveProfile.premiumExpiresAt);
                                                             return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                        })()
                                                    ) : t('settings.membership.lifetime')}
                                                </strong>
                                            </div>
                                        ) : (
                                            <span>{t('settings.membership.unlockFeatures')}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(ROUTES.UPGRADE)}
                                    className="w-full py-2.5 px-4 text-xs font-black bg-amber-500 hover:bg-amber-600 active:translate-y-0.5 border-2 border-amber-600 border-b-4 border-b-amber-700 active:border-b-2 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider select-none"
                                >
                                    <Crown className="w-3.5 h-3.5 fill-white text-white" />
                                    <span>{hasPremium ? t('settings.membership.managePackage') : t('settings.membership.upgradeNow')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Avatar Picker popdown */}
                        {showAvatarPicker && (
                            <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4 space-y-3">
                                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 gap-1 max-w-xs border border-slate-200/60 dark:border-slate-600/60">
                                    <button
                                        onClick={() => setAvatarTab('emoji')}
                                        className={`flex-1 py-1 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${avatarTab === 'emoji' ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-400 border border-sky-400/50 border-b-2 border-b-sky-500 shadow-xs' : 'text-slate-500'}`}
                                    >
                                        Emoji
                                    </button>
                                    <button
                                        onClick={() => setAvatarTab('photo')}
                                        className={`flex-1 py-1 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${avatarTab === 'photo' ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-400 border border-sky-400/50 border-b-2 border-b-sky-500 shadow-xs' : 'text-slate-500'}`}
                                    >
                                        {t('settings.account.yourPhoto')}
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
                                                            ? 'bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-500 border-b-4 border-b-sky-600'
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
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:translate-y-0.5 border-2 border-sky-600 border-b-4 border-b-sky-700 active:border-b-2 text-white text-xs font-black transition-all cursor-pointer select-none"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {t('settings.account.uploadNewPhoto')}
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
                            <Shield className="w-4 h-4 text-sky-500" />
                            {linkedProviders.includes('password') ? t('settings.account.changePassword') : t('settings.account.createPassword')}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {linkedProviders.includes('password') && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        {t('settings.account.currentPassword')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showOldPassword ? 'text' : 'password'}
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="w-full px-3.5 py-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                                            placeholder={t('settings.account.currentPasswordPlaceholder')}
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
                                    {t('settings.account.newPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3.5 py-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                                        placeholder={t('settings.account.passwordMinLength')}
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
                                    {t('settings.account.confirmPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3.5 py-2 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                                        placeholder={t('settings.account.confirmPasswordPlaceholder')}
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
                                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 active:translate-y-0.5 border-2 border-sky-600 border-b-4 border-b-sky-700 active:border-b-2 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs select-none"
                            >
                                {isSavingPassword ? t('settings.account.saving') : (linkedProviders.includes('password') ? t('settings.account.savePassword') : t('settings.account.createPassword'))}
                            </button>
                        </div>
                    </div>

                    {/* Tài khoản liên kết */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                            {t('settings.account.linkedAccounts')}
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
                                        {linkedProviders.includes('google.com') ? t('settings.account.googleLinkedDesc') : t('settings.account.notLinked')}
                                    </p>
                                </div>
                            </div>

                            {linkedProviders.includes('google.com') ? (
                                <button
                                    onClick={handleUnlinkGoogle}
                                    disabled={isLinking || linkedProviders.length <= 1}
                                    className="px-3.5 py-1.5 text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border-2 border-rose-200 dark:border-rose-800 border-b-4 border-b-rose-300 dark:border-b-rose-900 active:translate-y-0.5 active:border-b-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer select-none"
                                >
                                    {t('settings.account.unlink')}
                                </button>
                            ) : (
                                <button
                                    onClick={handleLinkGoogle}
                                    disabled={isLinking}
                                    className="px-3.5 py-1.5 text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border-2 border-sky-200 dark:border-sky-800 border-b-4 border-b-sky-300 dark:border-b-sky-900 active:translate-y-0.5 active:border-b-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer select-none"
                                >
                                    {isLinking ? '...' : t('settings.account.linkNow')}
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
                                <Gift className="w-5 h-5 text-sky-500" />
                                {t('settings.referral.heroTitle')}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('settings.referral.heroSub') }} />
                        </div>

                        {/* 3 Panels Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Panel 1: Mã giới thiệu của bạn */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        {t('settings.referral.yourCodeTitle')}
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                        {t('settings.referral.yourCodeSub')}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs min-w-0">
                                    <span className="text-sm sm:text-base font-black font-mono tracking-wider text-sky-600 dark:text-sky-400 truncate">
                                        {effectiveProfile?.referralCode || '...'}
                                    </span>
                                    <button
                                        onClick={handleCopyRawCode}
                                        className="shrink-0 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 active:translate-y-0.5 border-2 border-sky-600 border-b-4 border-b-sky-700 active:border-b-2 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none"
                                        title={t('settings.referral.copyCode')}
                                    >
                                        {copiedRaw ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-white" />
                                                <span className="text-white">{t('settings.referral.copied')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>{t('settings.referral.copyCode')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Panel 2: Nhập mã bạn bè */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        {t('settings.referral.friendCodeTitle')}
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                        {t('settings.referral.friendCodeSub')}
                                    </p>
                                </div>

                                {effectiveProfile?.referredBy ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <p className="font-bold text-emerald-700 dark:text-emerald-300">{t('settings.referral.alreadyReferred')}</p>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 text-[11px] pl-5.5">
                                            {t('settings.referral.by')} <strong>{effectiveProfile.referredBy.name}</strong> ({effectiveProfile.referredBy.code})
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input
                                                type="text"
                                                placeholder={t('settings.referral.codePlaceholder')}
                                                value={enteredCode}
                                                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                                                className="min-w-0 flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono font-bold uppercase text-slate-800 dark:text-slate-100 placeholder:normal-case"
                                            />
                                            <button
                                                onClick={handleApplyReferral}
                                                disabled={submitLoading || !enteredCode.trim()}
                                                className="shrink-0 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 active:translate-y-0.5 border-2 border-sky-600 border-b-4 border-b-sky-700 active:border-b-2 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all cursor-pointer select-none whitespace-nowrap shadow-xs"
                                            >
                                                {submitLoading ? '...' : t('settings.referral.sendCode')}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400">{t('settings.referral.codeBonusHint')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Panel 3: Thống kê */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                        {t('settings.referral.statsTitle')}
                                    </span>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                                        {t('settings.referral.statsSub')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                        <span className="text-[10px] text-slate-400 block font-semibold">{t('settings.referral.totalInvited')}</span>
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
                                {t('settings.referral.progressionTitle')}
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { step: 1, label: t('settings.referral.step1'), bonus: language === 'vi' ? '+15 ngày' : '+15 days' },
                                    { step: 2, label: t('settings.referral.step2'), bonus: language === 'vi' ? '+15 ngày' : '+15 days' },
                                    { step: 3, label: t('settings.referral.step3'), bonus: language === 'vi' ? '+20 ngày' : '+20 days' },
                                    { step: 4, label: t('settings.referral.step4'), bonus: language === 'vi' ? '+1 tháng/bạn' : '+1 mo/friend' }
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
                                                    ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                                                    : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-400'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold block uppercase">{milestone.label}</span>
                                            <span className="text-sm font-black mt-0.5 block">{milestone.bonus}</span>
                                            <span className="text-[9px] mt-1 block font-semibold opacity-80">
                                                {isAchieved ? t('settings.referral.achieved') : isNext ? t('settings.referral.nextUp') : t('settings.referral.notAchieved')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Lịch sử giới thiệu */}
                        <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4 space-y-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                {t('settings.referral.historyTitle')}
                            </span>

                            {loadingStats ? (
                                <div className="text-center py-4 text-xs text-slate-400">{t('common.loading')}</div>
                            ) : refStats.friends.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400">
                                    {t('settings.referral.historyEmpty')}
                                </div>
                            ) : (
                                <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-700 text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase text-slate-400">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left">{t('settings.referral.thFriendName')}</th>
                                                <th className="px-4 py-2.5 text-center">{t('settings.referral.thPackage')}</th>
                                                <th className="px-4 py-2.5 text-right">{t('settings.referral.thJoinedDate')}</th>
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
                                                        {new Date(friend.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
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
                                    <Type className="w-4 h-4 text-sky-500" />
                                    {t('settings.general.furiganaTitle')}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('settings.general.furiganaSub')}
                                </p>
                            </div>

                            <div className="pt-2 space-y-4">
                                {/* Màu sắc */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        {t('settings.general.furiganaColor')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {[
                                            { color: '#0284c7', name: t('settings.general.colorSky') },
                                            { color: '#059669', name: t('settings.general.colorGreen') },
                                            { color: '#d97706', name: t('settings.general.colorAmber') },
                                            { color: '#dc2626', name: t('settings.general.colorRed') },
                                            { color: '#4b5563', name: t('settings.general.colorGray') }
                                        ].map((setting) => (
                                            <button
                                                key={setting.color}
                                                type="button"
                                                onClick={() => setFuriganaColor(setting.color)}
                                                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                                                    furiganaColor === setting.color ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800' : ''
                                                }`}
                                                style={{ backgroundColor: setting.color }}
                                                title={setting.name}
                                            >
                                                {furiganaColor === setting.color && <Check className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Kích thước (Duolingo 3D buttons) */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        {t('settings.general.furiganaSize')}
                                    </span>
                                    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700/80 p-1.5 gap-1.5 border border-slate-200/60 dark:border-slate-600/60">
                                        {[
                                            { value: '0.5em', label: t('settings.general.sizeSmall') },
                                            { value: '0.6em', label: t('settings.general.sizeMedium') },
                                            { value: '0.8em', label: t('settings.general.sizeLarge') }
                                        ].map((size) => {
                                            const isSelected = furiganaFontSize === size.value;
                                            return (
                                                <button
                                                    key={size.value}
                                                    type="button"
                                                    onClick={() => setFuriganaFontSize(size.value)}
                                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                                                        isSelected
                                                            ? 'bg-sky-500 text-white border-2 border-sky-600 border-b-4 border-b-sky-700 active:translate-y-0.5 active:border-b-2 shadow-xs'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 hover:bg-slate-50 dark:hover:bg-slate-750 active:translate-y-0.5 active:border-b-2'
                                                    }`}
                                                >
                                                    {size.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Xem trước trực tiếp */}
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('settings.general.previewLabel')}</span>
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
                                        <Volume2 className="w-4 h-4 text-sky-500" />
                                        {t('settings.general.sfxTitle')}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t('settings.general.sfxSub')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSfxEnabled(!sfxEnabled)}
                                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                                        sfxEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
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
                                        <span className="text-slate-500 font-semibold">{t('settings.general.sfxVolume')}</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">{Math.round(sfxVolume * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={sfxVolume * 100}
                                        onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. Giọng đọc phát âm AI */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Play className="w-4 h-4 text-sky-500" />
                                    {t('settings.general.ttsTitle')}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('settings.general.ttsSub')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {Object.values(TTS_VOICES).map(voice => {
                                    const isSelected = ttsVoice === voice.id;
                                    return (
                                        <button
                                            key={voice.id}
                                            onClick={() => {
                                                setTtsVoiceState(voice.id);
                                            }}
                                            className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer select-none ${
                                                isSelected
                                                    ? 'border-sky-500 border-b-4 border-b-sky-600 bg-sky-50/60 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 shadow-xs active:translate-y-0.5 active:border-b-2'
                                                    : 'border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 bg-white dark:bg-slate-800/80 hover:bg-slate-50 text-slate-700 dark:text-slate-300 active:translate-y-0.5 active:border-b-2'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xl">{voice.gender === 'Female' ? '👩' : '👨'}</span>
                                                <span className="text-xs font-black">
                                                    {t('settings.general.voiceLabel', { label: voice.label })}
                                                </span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => {
                                    setIsPreviewingVoice(true);
                                    setTTSVoice(ttsVoice);
                                    speakJapanese(isEnglishMode ? 'Hello, this is your pronunciation assistant.' : 'こんにちは、こちらは音声テストです。');
                                    setTimeout(() => setIsPreviewingVoice(false), 2500);
                                }}
                                disabled={isPreviewingVoice}
                                className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:translate-y-0.5 border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 active:border-b-2 text-slate-700 dark:text-slate-200 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none disabled:opacity-50"
                            >
                                {isPreviewingVoice ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                                        <span>{t('settings.general.testingVoice')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-3.5 h-3.5 text-sky-500" />
                                        <span>{t('settings.general.testVoice')}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 4. Chủ đề giao diện */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-sky-500" />
                                    {t('settings.general.themeTitle')}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('settings.general.themeSub')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsDarkMode(false)}
                                    className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer select-none ${
                                        !isDarkMode
                                            ? 'border-sky-500 border-b-4 border-b-sky-600 bg-sky-50/60 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 shadow-xs active:translate-y-0.5 active:border-b-2'
                                            : 'border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 bg-white dark:bg-slate-800/80 hover:bg-slate-50 text-slate-700 dark:text-slate-300 active:translate-y-0.5 active:border-b-2'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Sun className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-black text-slate-800 dark:text-white">{t('settings.general.themeLight')}</span>
                                    </div>
                                    {!isDarkMode && <Check className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
                                </button>

                                <button
                                    onClick={() => setIsDarkMode(true)}
                                    className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer select-none ${
                                        isDarkMode
                                            ? 'border-sky-500 border-b-4 border-b-sky-600 bg-sky-50/60 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 shadow-xs active:translate-y-0.5 active:border-b-2'
                                            : 'border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 bg-white dark:bg-slate-800/80 hover:bg-slate-50 text-slate-700 dark:text-slate-300 active:translate-y-0.5 active:border-b-2'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Moon className="w-4 h-4 text-sky-400" />
                                        <span className="text-xs font-black text-slate-800 dark:text-white">{t('settings.general.themeDark')}</span>
                                    </div>
                                    {isDarkMode && <Check className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
                                </button>
                            </div>
                        </div>

                        {/* 4.1. Hình nền không gian học tập (Japanese Torii & Study Backgrounds) */}
                        <div className="p-5 sm:p-6 space-y-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="text-base">⛩️</span>
                                    {t('settings.general.bgThemeTitle', 'Hình nền không gian học tập')}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('settings.general.bgThemeSub', 'Chọn hình nền phong cách Cổng đỏ Nhật Bản, bầu trời sao hoặc công nghệ')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {BG_THEME_LIST.map((item) => {
                                    const isSelected = bgTheme === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setBgTheme(item.id)}
                                            className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer select-none ${
                                                isSelected
                                                    ? 'border-red-500 border-b-4 border-b-red-600 bg-red-50/60 dark:bg-red-950/30 active:translate-y-0.5 active:border-b-2'
                                                    : 'border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 hover:bg-slate-50 bg-white/50 dark:bg-slate-800/40 active:translate-y-0.5 active:border-b-2'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xl shrink-0">{item.icon}</span>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                                                        {t(item.nameKey, item.id)}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                                        {t(item.descKey, '')}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 ml-2" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Stars Animation / Static Mode Toggle */}
                            <div className="pt-2 flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {t('settings.general.bgAnimationTitle', 'Hiệu ứng chuyển động (Animation)')}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {t('settings.general.bgAnimationSub', 'Bật chuyển động lấp lánh hoặc giữ hình nền tĩnh hoàn toàn (tiết kiệm pin & tập trung)')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAnimated(!isAnimated)}
                                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        isAnimated ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                                    }`}
                                    title={isAnimated ? 'Đang bật chuyển động sao' : 'Đang bật chế độ nền tĩnh'}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            isAnimated ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* 5. Giới hạn học trước SRS (Learn Ahead Limit) */}
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-sky-500" />
                                        {t('settings.general.learnAheadTitle')}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t('settings.general.learnAheadSub')}
                                    </p>
                                </div>
                                <select
                                    value={learnAheadLimit}
                                    onChange={(e) => setLearnAheadLimit(Number(e.target.value))}
                                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-600 cursor-pointer outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                >
                                    <option value={0}>{t('settings.general.learnAheadOption0')}</option>
                                    <option value={5}>{t('settings.general.learnAheadOption5')}</option>
                                    <option value={10}>{t('settings.general.learnAheadOption10')}</option>
                                    <option value={20}>{t('settings.general.learnAheadOption20')}</option>
                                    <option value={30}>{t('settings.general.learnAheadOption30')}</option>
                                    <option value={60}>{t('settings.general.learnAheadOption60')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Nút LƯU CÀI ĐẶT (ĐỒNG BỘ WEB & MOBILE) - Duolingo 3D Emerald */}
                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={handleSaveGeneralSettings}
                            disabled={isSavingSettings}
                            className="w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-600 active:translate-y-0.5 border-2 border-emerald-600 border-b-4 border-b-emerald-700 active:border-b-2 text-white rounded-2xl font-black text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none"
                        >
                            {isSavingSettings ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t('settings.general.savingSync')}</span>
                                </>
                            ) : saveSuccess ? (
                                <>
                                    <Check className="w-4 h-4 text-emerald-100" />
                                    <span>{t('settings.general.savedSuccess')}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{t('settings.general.saveBtn')}</span>
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
