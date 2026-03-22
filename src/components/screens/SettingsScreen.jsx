import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Settings, User, Volume2, VolumeX, Music, Sun, Moon,
    ArrowLeft, Save, Check, X,
    Palette, Bell, Shield, Info, Trash2, Upload, Play, Pause, Mic, Edit, Type, Camera
} from 'lucide-react';
import AvatarCropper from '../ui/AvatarCropper';
import { ROUTES } from '../../router';
import {
    getSfxVolume, getBgmVolume, isSfxEnabled,
    startBackgroundMusic, stopBackgroundMusic, updateBgmVolume, isBgmPlaying,
    getAllBgmTracks, getSelectedTrackId, setSelectedTrack,
    addCustomBgmTrack, removeCustomBgmTrack
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

    // Account state
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
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

    // Kiểm tra avatar có phải ảnh custom không
    const isCustomPhoto = (avatarValue) => typeof avatarValue === 'string' && avatarValue.startsWith('data:image/');

    // Lấy display content cho avatar
    const getAvatarDisplay = (avatarValue, sizeClass = 'text-5xl') => {
        if (isCustomPhoto(avatarValue)) {
            return <img src={avatarValue} alt="avatar" className="w-full h-full object-cover" />;
        }
        return <span className={sizeClass}>{getAvatarEmoji(avatarValue)}</span>;
    };

    // Linked accounts state
    const [linkedProviders, setLinkedProviders] = useState([]);
    const [isLinking, setIsLinking] = useState(false);

    // Settings state
    const [sfxVolume, setSfxVolume] = useState(() => getSfxVolume());
    const [bgmVolume, setBgmVolume] = useState(() => getBgmVolume());
    const [sfxEnabled, setSfxEnabled] = useState(() => isSfxEnabled());
    const [bgmEnabled, setBgmEnabled] = useState(() => {
        const settings = getSettings();
        return settings.bgmEnabled !== false;
    });
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

    // BGM track state
    const [selectedTrack, setSelectedTrackState] = useState(() => getSelectedTrackId());
    const [bgmTracks, setBgmTracks] = useState(() => getAllBgmTracks());
    const [uploadingBgm, setUploadingBgm] = useState(false);

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
        settings.bgmVolume = bgmVolume;
        settings.sfxEnabled = sfxEnabled;
        settings.bgmEnabled = bgmEnabled;
        settings.furiganaEnabled = furiganaEnabled;
        settings.furiganaColor = furiganaColor;
        settings.furiganaFontSize = furiganaFontSize;
        saveSettings(settings);

        // Dispatch event for other components to react
        window.dispatchEvent(new Event('quizki-settings-changed'));
    }, [sfxVolume, bgmVolume, sfxEnabled, bgmEnabled, furiganaEnabled, furiganaColor, furiganaFontSize]);

    // Handle BGM volume changes
    useEffect(() => {
        updateBgmVolume(bgmVolume);
    }, [bgmVolume]);

    // Handle BGM toggle
    useEffect(() => {
        if (bgmEnabled && !isBgmPlaying()) {
            startBackgroundMusic();
        } else if (!bgmEnabled) {
            stopBackgroundMusic();
        }
    }, [bgmEnabled]);



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
                    {/* Avatar Section */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4" /> Ảnh đại diện & Thông tin
                        </h3>
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div
                                    className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-5xl shadow-lg border-2 border-white dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform"
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
                            <div className="flex-1">
                                <p className="font-bold text-gray-800 dark:text-white text-lg">{profile?.displayName || 'Chưa đặt tên'}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">{profile?.email || 'Không có email'}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        onClick={() => { setShowAvatarPicker(!showAvatarPicker); setAvatarTab('emoji'); }}
                                        className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
                                    >
                                        {showAvatarPicker ? 'Đóng' : '🎨 Đổi avatar'}
                                    </button>
                                    <span className="text-gray-200 dark:text-gray-700">|</span>
                                    <button
                                        onClick={() => setShowAvatarCropper(true)}
                                        className="text-xs text-purple-500 hover:text-purple-600 dark:text-purple-400 font-medium transition-colors flex items-center gap-1"
                                    >
                                        <Camera className="w-3 h-3" />
                                        Tải ảnh lên
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Avatar Picker Grid */}
                        {showAvatarPicker && (
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
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
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${avatarTab === 'photo' ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        <Camera className="w-3 h-3" /> Ảnh của bạn
                                    </button>
                                </div>

                                {avatarTab === 'emoji' && (
                                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto pr-1">
                                        {AVATAR_LIST.map(avatar => (
                                            <button
                                                key={avatar.id}
                                                onClick={() => handleSelectAvatar(avatar.id)}
                                                className={`group relative flex flex-col items-center p-2 rounded-xl transition-all ${profile?.avatar === avatar.id
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-400 scale-105 shadow-md'
                                                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:scale-110 border border-gray-100 dark:border-gray-600'}`}
                                                title={avatar.name}
                                            >
                                                <span className="text-2xl">{avatar.emoji}</span>
                                                <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-full leading-tight">{avatar.name}</span>
                                                {profile?.avatar === avatar.id && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                                        <Check className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {avatarTab === 'photo' && (
                                    <div className="space-y-3">
                                        {isCustomPhoto(profile?.avatar) ? (
                                            <div className="flex items-center gap-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-purple-300 dark:border-purple-700">
                                                    <img src={profile.avatar} alt="Current avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-purple-700 dark:text-purple-300">Ảnh hiện tại</p>
                                                    <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-0.5">Ảnh tùy chỉnh đang được sử dụng</p>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectAvatar('fox')}
                                                    className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 py-4">
                                                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                    <Camera className="w-7 h-7 text-purple-400" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Chưa có ảnh tùy chỉnh</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => { setShowAvatarPicker(false); setShowAvatarCropper(true); }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-bold shadow-md shadow-purple-200 dark:shadow-purple-900/30 transition-all"
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

                    {/* Display Name */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Tên hiển thị
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                placeholder="Tên hiển thị"
                            />
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving || displayName === profile?.displayName}
                                className="px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save className="w-4 h-4" />}
                                Lưu
                            </button>
                        </div>
                    </div>

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
                            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white rounded-xl font-bold text-sm hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
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
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                            {accountMsg}
                        </div>
                    )}
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

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4" />

                        {/* BGM Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Music className={`w-5 h-5 ${bgmEnabled ? 'text-purple-500' : 'text-gray-400'}`} />
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nhạc nền</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Nhạc nền Lo-fi trong khi học</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setBgmEnabled(!bgmEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${bgmEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform`}
                                    style={{ left: bgmEnabled ? '26px' : '2px' }}
                                />
                            </button>
                        </div>

                        {/* BGM Volume */}
                        {bgmEnabled && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Âm lượng nhạc nền</span>
                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{Math.round(bgmVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={bgmVolume * 100}
                                    onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        )}

                        {/* BGM Track Selector */}
                        {bgmEnabled && (
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chọn nhạc nền</span>
                                    <span className="text-xs text-gray-400">{bgmTracks.length} bài</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                    {bgmTracks.map(track => (
                                        <button
                                            key={track.id}
                                            onClick={() => {
                                                setSelectedTrack(track.id);
                                                setSelectedTrackState(track.id);
                                            }}
                                            className={`relative p-3 rounded-xl text-left transition-all group ${selectedTrack === track.id
                                                ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                                                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-600'
                                                }`}
                                        >
                                            <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${track.color} mb-2`} />
                                            <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{track.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{track.description}</p>
                                            {selectedTrack === track.id && (
                                                <div className="absolute top-1.5 right-1.5">
                                                    <Check className="w-3.5 h-3.5 text-purple-500" />
                                                </div>
                                            )}
                                            {/* Delete button for custom tracks */}
                                            {track.type === 'mp3' && isAdmin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeCustomBgmTrack(track.id);
                                                        setBgmTracks(getAllBgmTracks());
                                                        if (selectedTrack === track.id) setSelectedTrackState('lofi-chill');
                                                    }}
                                                    className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Admin: Upload custom MP3 */}
                                {isAdmin && (
                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                                            <Upload className="w-3.5 h-3.5" /> Thêm nhạc tùy chỉnh (MP3)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="file"
                                                accept="audio/mp3,audio/mpeg,audio/*"
                                                className="flex-1 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:dark:bg-purple-900/30 file:text-purple-600 file:dark:text-purple-400 hover:file:bg-purple-200 file:dark:hover:bg-purple-900/50 file:cursor-pointer text-gray-400"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (file.size > 10 * 1024 * 1024) {
                                                        showToast('File quá lớn! Tối đa 10MB.', 'warning');
                                                        return;
                                                    }
                                                    setUploadingBgm(true);
                                                    try {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            const name = file.name.replace(/\.[^/.]+$/, '');
                                                            addCustomBgmTrack(name, reader.result);
                                                            setBgmTracks(getAllBgmTracks());
                                                            e.target.value = '';
                                                            setUploadingBgm(false);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    } catch (err) {
                                                        console.error('Error uploading BGM:', err);
                                                        setUploadingBgm(false);
                                                    }
                                                }}
                                                disabled={uploadingBgm}
                                            />
                                        </div>
                                        {uploadingBgm && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-purple-500">
                                                <div className="animate-spin w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full" />
                                                Đang tải lên...
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Hỗ trợ file MP3, tối đa 10MB. Lưu trữ cục bộ trên trình duyệt.</p>
                                    </div>
                                )}
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
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-inner">
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
