import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Settings, User, Volume2, VolumeX, Music, Sun, Moon,
    MessageSquare, Send, ArrowLeft, Save, Check, X,
    Clock, CheckCircle, XCircle, ChevronRight, Palette,
    Bell, Shield, Info, Trash2, Upload, Play, Pause, Image as ImageIcon, Key
} from 'lucide-react';
import { ROUTES } from '../../router';
import {
    getSfxVolume, getBgmVolume, isSfxEnabled,
    startBackgroundMusic, stopBackgroundMusic, updateBgmVolume, isBgmPlaying,
    getAllBgmTracks, getSelectedTrackId, setSelectedTrack,
    addCustomBgmTrack, removeCustomBgmTrack
} from '../../utils/soundEffects';
import { collection, addDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { getPixabayApiKey, setPixabayApiKey, isPixabayConfigured } from '../../utils/imageSearch';

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

// ==================== Feedback Status Badge ====================
const StatusBadge = ({ status }) => {
    const config = {
        pending: { label: 'Chưa xử lý', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
        resolved: { label: 'Đã xử lý', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
        rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    };
    const { label, color, icon: Icon } = config[status] || config.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${color}`}>
            <Icon className="w-3 h-3" /> {label}
        </span>
    );
};

// ==================== Settings Screen ====================
const SettingsScreen = ({ profile, isDarkMode, setIsDarkMode, userId, onUpdateProfileName, onChangePassword, isAdmin }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('account');

    // Account state
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [accountMsg, setAccountMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Settings state
    const [sfxVolume, setSfxVolume] = useState(() => getSfxVolume());
    const [bgmVolume, setBgmVolume] = useState(() => getBgmVolume());
    const [sfxEnabled, setSfxEnabled] = useState(() => isSfxEnabled());
    const [bgmEnabled, setBgmEnabled] = useState(() => {
        const settings = getSettings();
        return settings.bgmEnabled !== false;
    });

    // BGM track state
    const [selectedTrack, setSelectedTrackState] = useState(() => getSelectedTrackId());
    const [bgmTracks, setBgmTracks] = useState(() => getAllBgmTracks());
    const [uploadingBgm, setUploadingBgm] = useState(false);

    // Pixabay API key state
    const [pixabayKey, setPixabayKey] = useState(() => getPixabayApiKey());
    const [pixabaySaved, setPixabaySaved] = useState(false);

    // Feedback state
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackCategory, setFeedbackCategory] = useState('bug');
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);

    // Update display name when profile changes
    useEffect(() => {
        if (profile?.displayName) setDisplayName(profile.displayName);
    }, [profile]);

    // Save settings whenever they change
    useEffect(() => {
        const settings = getSettings();
        settings.sfxVolume = sfxVolume;
        settings.bgmVolume = bgmVolume;
        settings.sfxEnabled = sfxEnabled;
        settings.bgmEnabled = bgmEnabled;
        saveSettings(settings);
    }, [sfxVolume, bgmVolume, sfxEnabled, bgmEnabled]);

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

    // Feedback collection path - shared/public so all users can see all feedbacks
    const feedbackPath = `artifacts/${appId}/public/data/feedbacks`;

    // Load feedbacks - ALL users see ALL feedbacks
    const loadFeedbacks = useCallback(async () => {
        if (!userId || !db) return;
        setIsLoadingFeedback(true);
        try {
            const q = query(collection(db, feedbackPath), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setFeedbacks(items);
        } catch (e) {
            console.error('Error loading feedbacks:', e);
        }
        setIsLoadingFeedback(false);
    }, [userId]);

    useEffect(() => {
        if (activeTab === 'feedback') {
            loadFeedbacks();
        }
    }, [activeTab, loadFeedbacks]);

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

    // Handle change password
    const handleChangePassword = async () => {
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
            await onChangePassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
            setAccountMsg('Đã đổi mật khẩu thành công!');
            setTimeout(() => setAccountMsg(''), 3000);
        } catch (e) {
            setAccountMsg('Lỗi: ' + e.message);
        }
        setIsSaving(false);
    };

    // Handle send feedback - save to shared public collection
    const handleSendFeedback = async () => {
        if (!feedbackText.trim() || !userId) return;
        setIsSendingFeedback(true);
        try {
            await addDoc(collection(db, feedbackPath), {
                userId,
                displayName: profile?.displayName || 'Người dùng',
                text: feedbackText.trim(),
                category: feedbackCategory,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            setFeedbackText('');
            setFeedbackMsg('Phản hồi đã được gửi! Cảm ơn bạn.');
            setTimeout(() => setFeedbackMsg(''), 3000);
            loadFeedbacks();
        } catch (e) {
            setFeedbackMsg('Lỗi: ' + e.message);
        }
        setIsSendingFeedback(false);
    };

    // Admin: Update feedback status
    const handleUpdateFeedbackStatus = async (feedbackId, newStatus) => {
        if (!isAdmin) return;
        try {
            await updateDoc(doc(db, feedbackPath, feedbackId), { status: newStatus });
            loadFeedbacks();
        } catch (e) {
            console.error('Error updating feedback:', e);
        }
    };

    // Admin: Delete feedback
    const handleDeleteFeedback = async (feedbackId) => {
        if (!isAdmin) return;
        try {
            await deleteDoc(doc(db, feedbackPath, feedbackId));
            loadFeedbacks();
        } catch (e) {
            console.error('Error deleting feedback:', e);
        }
    };

    const tabs = [
        { id: 'account', label: 'Tài khoản', icon: User },
        { id: 'general', label: 'Cài đặt chung', icon: Settings },
        { id: 'feedback', label: 'Phản hồi', icon: MessageSquare },
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
                    {/* Display Name */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4" /> Thông tin tài khoản
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <p className="text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-700 px-4 py-2.5 rounded-xl">
                                {profile?.email || 'Không có email'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên hiển thị</label>
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
                    </div>

                    {/* Change Password */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Đổi mật khẩu
                        </h3>
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
                            Đổi mật khẩu
                        </button>
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
                                                        alert('File quá lớn! Tối đa 10MB.');
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

                    {/* Pixabay API Key */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Tìm hình ảnh (Pixabay)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Đăng ký API key miễn phí tại{' '}
                            <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-medium">pixabay.com/api/docs</a>
                            {' '}để tìm hình ảnh minh họa cho từ vựng.
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={pixabayKey}
                                    onChange={(e) => { setPixabayKey(e.target.value); setPixabaySaved(false); }}
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-gray-900 dark:text-gray-100 text-sm"
                                    placeholder="Nhập Pixabay API Key..."
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setPixabayApiKey(pixabayKey.trim());
                                    setPixabaySaved(true);
                                    setTimeout(() => setPixabaySaved(false), 3000);
                                }}
                                disabled={!pixabayKey.trim()}
                                className="px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {pixabaySaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {pixabaySaved ? 'Đã lưu!' : 'Lưu'}
                            </button>
                        </div>
                        {isPixabayConfigured() && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                <Check className="w-3 h-3" />
                                <span>API Key đã được cấu hình</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== FEEDBACK TAB ==================== */}
            {activeTab === 'feedback' && (
                <div className="space-y-4">
                    {/* Send Feedback */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Send className="w-4 h-4" /> Gửi phản hồi
                        </h3>
                        <div className="flex gap-2">
                            {[
                                { value: 'bug', label: '🐛 Lỗi' },
                                { value: 'feature', label: '💡 Đề xuất' },
                                { value: 'other', label: '📝 Khác' },
                            ].map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setFeedbackCategory(cat.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${feedbackCategory === cat.value
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-300 dark:ring-indigo-700'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                            placeholder="Mô tả phản hồi của bạn..."
                        />
                        <button
                            onClick={handleSendFeedback}
                            disabled={!feedbackText.trim() || isSendingFeedback}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isSendingFeedback ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Gửi phản hồi
                        </button>
                        {feedbackMsg && (
                            <p className={`text-sm font-medium text-center ${feedbackMsg.includes('Lỗi') ? 'text-red-500' : 'text-emerald-500'
                                }`}>{feedbackMsg}</p>
                        )}
                    </div>

                    {/* Feedback History */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Tất cả phản hồi
                        </h3>
                        {isLoadingFeedback ? (
                            <div className="text-center py-6">
                                <div className="animate-spin w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full mx-auto" />
                            </div>
                        ) : feedbacks.length === 0 ? (
                            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">Chưa có phản hồi nào</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {feedbacks.map((fb) => (
                                    <div key={fb.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {isAdmin && <span className="text-xs text-gray-400">{fb.displayName}</span>}
                                                <span className="text-xs text-gray-400">
                                                    {fb.category === 'bug' ? '🐛' : fb.category === 'feature' ? '💡' : '📝'}
                                                </span>
                                                <StatusBadge status={fb.status} />
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString('vi-VN') : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{fb.text}</p>
                                        {isAdmin && (
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => handleUpdateFeedbackStatus(fb.id, 'resolved')}
                                                    className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                                                >
                                                    ✓ Đã xử lý
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateFeedbackStatus(fb.id, 'rejected')}
                                                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                                                >
                                                    ✕ Từ chối
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateFeedbackStatus(fb.id, 'pending')}
                                                    className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all"
                                                >
                                                    ⏳ Chờ xử lý
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Xóa phản hồi này?')) handleDeleteFeedback(fb.id);
                                                    }}
                                                    className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-bold hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all ml-auto"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;
