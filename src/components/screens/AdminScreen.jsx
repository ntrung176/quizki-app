import React, { useState, useEffect, useMemo } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs, getDoc, addDoc, where, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, appId } from '../../config/firebase';
import {
    Users, Search, Shield, Trash2, BarChart3, Clock,
    AlertTriangle, CheckCircle, Loader2, Languages, BookOpen,
    Sparkles, Bot, UserCheck, UserX, ToggleLeft, ToggleRight,
    ChevronDown, ChevronUp, Settings, Crown, ShieldCheck,
    CreditCard, Plus, Check, X as XIcon, Edit, Ticket,
    DollarSign, TrendingUp, TrendingDown, Calendar, Download, RefreshCw, Wifi, Bell, Send,
    MessageSquare, Image as ImageIcon
} from 'lucide-react';
import { updateAdminConfig, AI_PROVIDER_OPTIONS, OPENROUTER_MODELS, addModerator, removeModerator, DEFAULT_AI_PACKAGES, createVoucher, subscribeVouchers, deleteVoucher, toggleVoucher, subscribeCreditRequests, addExpense, subscribeExpenses, deleteExpense, manuallyApplyPackageToUser, sendGlobalNotification, deleteGlobalNotification } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const AdminScreen = ({ publicStatsPath, currentUserId, onAdminDeleteUserData, adminConfig, isAdmin }) => {
    // State
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('totalCards');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState('all');

    const [activeSection, setActiveSection] = useState('users');
    const [savingConfig, setSavingConfig] = useState(false);
    const [manualCreditUserId, setManualCreditUserId] = useState('');
    const [selectedPackageId, setSelectedPackageId] = useState('premium');
    const [manualCreditEmailSearch, setManualCreditEmailSearch] = useState('');

    // User filter state
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'moderator' | 'user'
    const [planFilter, setPlanFilter] = useState('all'); // 'all' | package id

    // Credit requests (for user subscription info)
    const [creditRequests, setCreditRequests] = useState([]);

    // Expense state
    const [expenses, setExpenses] = useState([]);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '', type: 'operating', recurring: 'monthly', description: '', month: new Date().toISOString().slice(0, 7) });
    const [expenseError, setExpenseError] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    // API balance state
    const [apiBalances, setApiBalances] = useState({ openRouter: null, speechGen: null, loading: false, error: '' });

    // Global notifications & maintenance states
    const [globalNotifications, setGlobalNotifications] = useState([]);
    const [newNotificationText, setNewNotificationText] = useState({ title: '', message: '' });
    const [notificationError, setNotificationError] = useState('');
    const [sendingNotification, setSendingNotification] = useState(false);

    // Fetch API balances
    const fetchApiBalances = async () => {
        setApiBalances(prev => ({ ...prev, loading: true, error: '' }));
        const results = { openRouter: null, speechGen: null, loading: false, error: '' };

        // 1. OpenRouter credits
        try {
            const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
            if (openRouterKey) {
                const res = await fetch('https://openrouter.ai/api/v1/credits', {
                    headers: { 'Authorization': `Bearer ${openRouterKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    results.openRouter = {
                        totalCredits: data.data?.total_credits || 0,
                        totalUsage: data.data?.total_usage || 0,
                        remaining: (data.data?.total_credits || 0) - (data.data?.total_usage || 0),
                    };
                } else {
                    results.openRouter = { error: `HTTP ${res.status}` };
                }
            } else {
                results.openRouter = { error: 'Chưa cấu hình API key' };
            }
        } catch (e) {
            results.openRouter = { error: e.message };
        }

        // 2. SpeechGen balance
        try {
            const speechToken = import.meta.env.VITE_SPEECHGEN_TOKEN;
            const speechEmail = import.meta.env.VITE_SPEECHGEN_EMAIL;
            const proxyUrl = import.meta.env.VITE_SPEECHGEN_PROXY_URL;
            if (speechToken && speechEmail && proxyUrl) {
                const baseProxy = proxyUrl.replace(/\/+$/, '');
                const res = await fetch(`${baseProxy}/balance?token=${encodeURIComponent(speechToken)}&email=${encodeURIComponent(speechEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    results.speechGen = {
                        balance: data.balans ?? data.balance ?? data.limit ?? null,
                    };
                } else {
                    // Fallback: try direct API
                    const directRes = await fetch(`https://speechgen.io/index.php?r=api/balance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: speechToken, email: speechEmail }),
                    });
                    if (directRes.ok) {
                        const data = await directRes.json();
                        results.speechGen = { balance: data.balans ?? data.balance ?? data.limit ?? null };
                    } else {
                        results.speechGen = { error: `HTTP ${res.status}` };
                    }
                }
            } else {
                results.speechGen = { error: 'Chưa cấu hình API key' };
            }
        } catch (e) {
            results.speechGen = { error: e.message };
        }

        setApiBalances(results);
    };

    // Voucher state
    const [vouchers, setVouchers] = useState([]);
    const [newVoucher, setNewVoucher] = useState({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '', description: '' });
    const [voucherError, setVoucherError] = useState('');

    // Load users
    useEffect(() => {
        if (!db || !publicStatsPath) return;
        const q = query(collection(db, publicStatsPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setUsers(userList);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [publicStatsPath]);


    // Load profile settings for selected user (AI credits & specialized packages)
    useEffect(() => {
        if (!selectedUser) {
            setSelectedUserProfile(null);
            return;
        }
        const loadProfile = async () => {
            setLoadingProfile(true);
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${selectedUser.userId}/settings/profile`);
                const snap = await getDoc(profileRef);
                if (snap.exists()) {
                    setSelectedUserProfile(snap.data());
                } else {
                    setSelectedUserProfile({ aiCreditsRemaining: 0, unlockedSpecializedPackages: [] });
                }
            } catch (e) {
                console.error('Error loading user profile:', e);
            } finally {
                setLoadingProfile(false);
            }
        };
        loadProfile();
    }, [selectedUser]);

    // Stats
    const stats = useMemo(() => {
        const total = users.length;
        const totalCards = users.reduce((sum, u) => sum + (u.totalCards || 0), 0);
        const activeToday = users.filter(u => {
            if (!u.lastActive) return false;
            const today = new Date().setHours(0, 0, 0, 0);
            return u.lastActive >= today;
        }).length;
        return { total, totalCards, activeToday };
    }, [users]);

    // Filtered and sorted users
    const filteredUsers = useMemo(() => {
        let result = [...users];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.displayName || '').toLowerCase().includes(q) ||
                (u.userId || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            );
        }
        // Role filter
        if (roleFilter === 'admin') {
            result = result.filter(u => u.userId === currentUserId);
        } else if (roleFilter === 'moderator') {
            result = result.filter(u => adminConfig?.moderators?.includes(u.userId));
        } else if (roleFilter === 'user') {
            result = result.filter(u => u.userId !== currentUserId && !adminConfig?.moderators?.includes(u.userId));
        }
        // Plan filter
        if (planFilter !== 'all') {
            const usersWithPlan = new Set(
                creditRequests
                    .filter(r => {
                        if (r.status !== 'approved') return false;
                        const pId = r.packageId;
                        if (pId === planFilter) return true;
                        if (planFilter.startsWith('ai_') && pId === planFilter.substring(3)) return true;
                        if (pId?.startsWith('ai_') && planFilter === pId.substring(3)) return true;
                        return false;
                    })
                    .map(r => r.userId)
            );
            result = result.filter(u => usersWithPlan.has(u.userId));
        }
        result.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'displayName':
                    aVal = (a.displayName || '').toLowerCase();
                    bVal = (b.displayName || '').toLowerCase();
                    break;
                default:
                    aVal = a.totalCards || 0;
                    bVal = b.totalCards || 0;
            }
            return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
        return result;
    }, [users, searchQuery, sortBy, sortOrder, roleFilter, planFilter, adminConfig, currentUserId, creditRequests]);

    const handleSelectUser = (user) => setSelectedUser(user);

    // Delete user data
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            if (deleteType === 'kanji') {
                const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${confirmDelete.userId}/kanjiSRS`));
                let deleted = 0;
                for (const docSnap of srsSnap.docs) {
                    await deleteDoc(docSnap.ref);
                    deleted++;
                }
                setUsers(prev => prev.map(u => u.userId === confirmDelete.userId ? { ...u, kanjiTotal: 0, kanjiMastered: 0 } : u));
                if (selectedUser?.userId === confirmDelete.userId) {
                    setSelectedUser(prev => prev ? { ...prev, kanjiTotal: 0, kanjiMastered: 0 } : null);
                }
                setNotification({ type: 'success', message: `Đã xóa ${deleted} dữ liệu Kanji SRS của ${confirmDelete.displayName}` });
            } else {
                if (onAdminDeleteUserData) await onAdminDeleteUserData(confirmDelete.userId);
                setUsers(prev => prev.filter(u => u.userId !== confirmDelete.userId));
                if (selectedUser?.userId === confirmDelete.userId) setSelectedUser(null);
                setNotification({ type: 'success', message: `Đã xóa toàn bộ dữ liệu ${confirmDelete.displayName}` });
            }
        } catch (e) {
            console.error('Error deleting:', e);
            setNotification({ type: 'error', message: 'Lỗi khi xóa: ' + e.message });
        } finally {
            setDeleting(false);
            setConfirmDelete(null);
            setDeleteType('all');
        }
    };

    // Admin config handlers
    const handleToggleAI = async () => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiEnabled: !adminConfig?.aiEnabled }, currentUserId);
        if (ok) setNotification({ type: 'success', message: adminConfig?.aiEnabled ? 'Đã tắt AI' : 'Đã bật AI' });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleToggleAIAllowAll = async () => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiAllowAll: !adminConfig?.aiAllowAll }, currentUserId);
        if (ok) setNotification({ type: 'success', message: adminConfig?.aiAllowAll ? 'Đã tắt AI cho tất cả' : 'Đã bật AI cho tất cả người dùng' });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleChangeProvider = async (provider) => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiProvider: provider }, currentUserId);
        if (ok) setNotification({ type: 'success', message: `Đã chuyển AI provider sang ${AI_PROVIDER_OPTIONS.find(p => p.value === provider)?.label || provider}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleChangeOpenRouterModel = async (model) => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ openRouterModel: model }, currentUserId);
        if (ok) setNotification({ type: 'success', message: `Đã đổi model OpenRouter sang ${OPENROUTER_MODELS.find(m => m.value === model)?.label || model}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleToggleModerator = async (userId, userName) => {
        setSavingConfig(true);
        const isMod = adminConfig?.moderators?.includes(userId);
        const ok = isMod
            ? await removeModerator(adminConfig, userId, currentUserId)
            : await addModerator(adminConfig, userId, currentUserId);
        if (ok) setNotification({ type: 'success', message: isMod ? `Đã gỡ quyền QTV của ${userName}` : `Đã cấp quyền QTV cho ${userName}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };


    // Clear notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);



    // Load vouchers
    useEffect(() => {
        const unsub = subscribeVouchers(setVouchers);
        return () => { if (unsub) unsub(); };
    }, []);

    // Load credit requests for subscription info
    useEffect(() => {
        const unsub = subscribeCreditRequests(setCreditRequests);
        return () => { if (unsub) unsub(); };
    }, []);

    // Load expenses
    useEffect(() => {
        const unsub = subscribeExpenses(setExpenses);
        return () => { if (unsub) unsub(); };
    }, []);

    // Load global notifications
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, `artifacts/${appId}/globalNotifications`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            list.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return bTime - aTime;
            });
            setGlobalNotifications(list);
        }, (error) => {
            console.error('Error loading global notifications:', error);
        });
        return () => unsubscribe();
    }, []);

    const handleSendNotification = async () => {
        if (!newNotificationText.title.trim() || !newNotificationText.message.trim()) {
            setNotificationError('Vui lòng điền đầy đủ tiêu đề và nội dung');
            return;
        }
        setSendingNotification(true);
        setNotificationError('');
        const ok = await sendGlobalNotification(newNotificationText.title, newNotificationText.message, currentUserId);
        if (ok) {
            setNewNotificationText({ title: '', message: '' });
            setNotification({ type: 'success', message: 'Đã gửi thông báo đến toàn bộ người dùng' });
        } else {
            setNotificationError('Lỗi khi gửi thông báo');
        }
        setSendingNotification(false);
    };

    const handleDeleteNotification = async (notifId) => {
        const ok = await deleteGlobalNotification(notifId);
        if (ok) {
            setNotification({ type: 'success', message: 'Đã xóa thông báo' });
        } else {
            setNotification({ type: 'error', message: 'Lỗi khi xóa thông báo' });
        }
    };

    // Helper: get user's purchased plans
    const getUserPlans = (userId) => {
        return creditRequests
            .filter(r => r.userId === userId && r.status === 'approved')
            .sort((a, b) => {
                const aTime = a.processedAt?.toDate ? a.processedAt.toDate().getTime() : (a.processedAt || 0);
                const bTime = b.processedAt?.toDate ? b.processedAt.toDate().getTime() : (b.processedAt || 0);
                return bTime - aTime;
            });
    };

    const kanjiStats = useMemo(() => {
        if (!selectedUser) return null;
        const total = selectedUser.kanjiTotal || 0;
        const mastered = selectedUser.kanjiMastered || 0;
        const learning = Math.max(0, total - mastered);
        return { total, learning, mastered };
    }, [selectedUser]);

    if (isLoading) {
        return <LoadingIndicator text="Đang tải danh sách người dùng..." />;
    }

    const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';



    const handleManualApplyPackage = async () => {
        if (!manualCreditUserId || !selectedPackageId) return;
        setSavingConfig(true);
        const user = users.find(u => u.userId === manualCreditUserId);
        
        // Find package info
        const pkgOptions = [
            { id: 'premium', name: 'Gói Premium (Tất cả tính năng)', type: 'premium' },
            { id: 'vocab_zen', name: 'Mở khóa Từ vựng Zen', type: 'specialized' },
            { id: 'grammar_zen', name: 'Mở khóa Ngữ pháp Zen', type: 'specialized' },
            { id: 'kanji_zen', name: 'Mở khóa Kanji Zen', type: 'specialized' },
            { id: 'jlpt_prep', name: 'Gói Luyện thi JLPT', type: 'specialized' },
            { id: 'ai_starter', name: 'Gói AI Starter (100 lượt)', type: 'ai', credits: 100 },
            { id: 'ai_popular', name: 'Gói AI Popular (500 lượt)', type: 'ai', credits: 500 },
            { id: 'ai_best_value', name: 'Gói AI Best Value (1000 lượt)', type: 'ai', credits: 1000 },
            { id: 'ai_ultimate', name: 'Gói AI Ultimate (3000 lượt)', type: 'ai', credits: 3000 }
        ];
        
        const pkg = pkgOptions.find(p => p.id === selectedPackageId);
        if (!pkg) {
            setNotification({ type: 'error', message: 'Gói không hợp lệ' });
            setSavingConfig(false);
            return;
        }

        const ok = await manuallyApplyPackageToUser(
            manualCreditUserId, 
            user?.displayName || '', 
            user?.email || '', 
            pkg, 
            currentUserId
        );
        
        if (ok) {
            setNotification({ 
                type: 'success', 
                message: `Đã áp dụng ${pkg.name} cho ${user?.displayName || manualCreditUserId}` 
            });
            setManualCreditUserId('');
            setManualCreditEmailSearch('');
            setSelectedPackageId('premium');
        } else {
            setNotification({ type: 'error', message: 'Lỗi khi áp dụng gói' });
        }
        setSavingConfig(false);
    };

    // Section tabs
    const sections = [
        { id: 'users', label: 'Người dùng', icon: Users },
        { id: 'support', label: 'Hỗ trợ trực tuyến', icon: MessageSquare },
        { id: 'ai', label: 'AI', icon: Bot },
        { id: 'credits', label: 'Gói & Lượt AI', icon: CreditCard },
        { id: 'revenue', label: 'Doanh thu', icon: DollarSign },
        { id: 'vouchers', label: 'Voucher', icon: Ticket },
        { id: 'moderators', label: 'QTV', icon: ShieldCheck },
        { id: 'system', label: 'Hệ thống & TB', icon: Settings },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-500" />
                        Quản lý Admin
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Quản lý người dùng, AI, và quyền quản trị viên
                    </p>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
                {sections.map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => setActiveSection(sec.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${activeSection === sec.id
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <sec.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{sec.label}</span>
                    </button>
                ))}
            </div>

            {/* ==================== USERS SECTION ==================== */}
            {activeSection === 'users' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
                                    <p className="text-xs text-gray-500">Tổng người dùng</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-purple-600">{stats.totalCards}</p>
                                    <p className="text-xs text-gray-500">Tổng flashcard</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-cyan-600">{stats.activeToday}</p>
                                    <p className="text-xs text-gray-500">Hoạt động hôm nay</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm theo tên, email hoặc ID..."
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white"
                            >
                                <option value="all">Tất cả vai trò</option>
                                <option value="admin">👑 Admin</option>
                                <option value="moderator">🛡️ Quản trị viên</option>
                                <option value="user">👤 Người dùng</option>
                            </select>
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white"
                            >
                                <option value="all">Tất cả gói</option>
                                <option value="premium">👑 Gói Premium</option>
                                <option value="vocab_zen">📖 Từ vựng Zen</option>
                                <option value="grammar_zen">✍️ Ngữ pháp Zen</option>
                                <option value="kanji_zen">💮 Kanji Zen</option>
                                <option value="jlpt_prep">🏆 Gói Luyện thi JLPT</option>
                                <option value="starter">📦 AI Starter (100 lượt)</option>
                                <option value="popular">📦 AI Popular (500 lượt)</option>
                                <option value="best_value">📦 AI Best Value (1000 lượt)</option>
                                <option value="ultimate">📦 AI Ultimate (3000 lượt)</option>
                            </select>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => { const [by, order] = e.target.value.split('-'); setSortBy(by); setSortOrder(order); }}
                                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white"
                            >
                                <option value="totalCards-desc">Nhiều thẻ nhất</option>
                                <option value="totalCards-asc">Ít thẻ nhất</option>
                                <option value="displayName-asc">Tên A-Z</option>
                                <option value="displayName-desc">Tên Z-A</option>
                            </select>
                        </div>
                    </div>

                    {/* Main Content: User List + Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* User List */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Danh sách người dùng ({filteredUsers.length})
                                </h3>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                {filteredUsers.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Không tìm thấy người dùng nào</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredUsers.map(user => {
                                            const isMod = adminConfig?.moderators?.includes(user.userId);
                                            return (
                                                <div
                                                    key={user.userId}
                                                    onClick={() => handleSelectUser(user)}
                                                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${selectedUser?.userId === user.userId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isMod ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                                                                {(user.displayName || '?')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                                    {user.displayName || 'Chưa đặt tên'}
                                                                    {user.userId === currentUserId && (
                                                                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Bạn</span>
                                                                    )}
                                                                    {isMod && (
                                                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                                            <Crown className="w-3 h-3" /> QTV
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span>{user.totalCards || 0} thẻ</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Details Panel */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            {selectedUser ? (
                                <div className="p-4 space-y-4">
                                    {/* User Header */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-indigo-500">
                                            {(selectedUser.displayName || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white">{selectedUser.displayName || 'Chưa đặt tên'}</p>
                                            <p className="text-xs text-gray-500 font-mono">{selectedUser.userId?.slice(0, 20)}...</p>
                                        </div>
                                    </div>

                                    {/* Account & Packages Info */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                            <Shield className="w-3.5 h-3.5 text-indigo-500" /> GÓI & TÀI KHOẢN
                                        </h4>
                                        {loadingProfile ? (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-500" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* AI Credits */}
                                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                                                            {(selectedUserProfile?.aiCreditsRemaining ?? 0).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">Lượt AI còn lại</p>
                                                    </div>
                                                    <Sparkles className="w-5 h-5 text-indigo-555" />
                                                </div>

                                                {/* Active Packages */}
                                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-1.5">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái gói học</p>
                                                    
                                                    {(() => {
                                                        const unlocked = selectedUserProfile?.unlockedSpecializedPackages || [];
                                                        const packageList = [
                                                            { id: 'premium', name: '👑 Gói Premium', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                                                            { id: 'vocab_zen', name: '📖 Từ vựng Zen', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                                                            { id: 'grammar_zen', name: '✍️ Ngữ pháp Zen', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                                                            { id: 'kanji_zen', name: '💮 Kanji Zen', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
                                                            { id: 'jlpt_prep', name: '🏆 Luyện thi JLPT', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
                                                        ];

                                                        return (
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                {packageList.map(pkg => {
                                                                    const isOwned = unlocked.includes(pkg.id);
                                                                    return (
                                                                        <div 
                                                                            key={pkg.id} 
                                                                            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center justify-between border ${
                                                                                isOwned 
                                                                                    ? `${pkg.color} border-current` 
                                                                                    : 'text-gray-400 dark:text-gray-600 bg-transparent border-gray-200 dark:border-gray-700'
                                                                            }`}
                                                                        >
                                                                            <span>{pkg.name}</span>
                                                                            {isOwned ? (
                                                                                <Check className="w-3 h-3 text-current flex-shrink-0" />
                                                                            ) : (
                                                                                <XIcon className="w-2.5 h-2.5 text-current flex-shrink-0" />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Vocabulary Stats */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                            <BookOpen className="w-3.5 h-3.5" /> TỪ VỰNG
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedUser.totalCards || 0}</p>
                                                <p className="text-xs text-gray-500">Flashcard</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedUser.masteredCount || 0}</p>
                                                <p className="text-xs text-gray-500">Đã thuộc</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kanji SRS Stats */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                            <Languages className="w-3.5 h-3.5" /> KANJI SRS
                                        </h4>
                                        {kanjiStats ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-emerald-600">{kanjiStats.total}</p>
                                                    <p className="text-xs text-gray-500">Tổng</p>
                                                </div>
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-amber-600">{kanjiStats.learning}</p>
                                                    <p className="text-xs text-gray-500">Đang học</p>
                                                </div>
                                                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-cyan-600">{kanjiStats.mastered}</p>
                                                    <p className="text-xs text-gray-500">Thành thạo</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Subscription / Purchased Plans */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                            <CreditCard className="w-3.5 h-3.5" /> GÓI ĐÃ MUA
                                        </h4>
                                        {(() => {
                                            const userPlans = getUserPlans(selectedUser.userId);
                                            if (userPlans.length === 0) {
                                                return (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                                        Chưa mua gói nào
                                                    </p>
                                                );
                                            }
                                            const totalCredits = userPlans.reduce((sum, r) => sum + (r.credits || 0), 0);
                                            const totalSpent = userPlans.reduce((sum, r) => sum + (r.amount || 0), 0);
                                            return (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                                            <p className="text-lg font-bold text-indigo-600">{userPlans.length}</p>
                                                            <p className="text-xs text-gray-500">Lần mua</p>
                                                        </div>
                                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                            <p className="text-lg font-bold text-emerald-600">{totalCredits.toLocaleString()}</p>
                                                            <p className="text-xs text-gray-500">Tổng thẻ</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-between">
                                                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Tổng chi tiêu</span>
                                                        <span className="text-sm font-bold text-amber-600">{formatVND(totalSpent)}</span>
                                                    </div>
                                                    <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                                                        {userPlans.map((r, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
                                                                <div>
                                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{r.packageName || r.packageId}</span>
                                                                    <span className="text-gray-400 ml-1.5">({r.credits} thẻ)</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-medium text-emerald-600">{formatVND(r.amount || 0)}</span>
                                                                    {r.processedAt && (
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                                            {(r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt)).toLocaleDateString('vi-VN')}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Quick Actions for selected user */}
                                    {selectedUser.userId !== currentUserId && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                            {/* Toggle Moderator */}
                                            <button
                                                onClick={() => handleToggleModerator(selectedUser.userId, selectedUser.displayName)}
                                                disabled={savingConfig}
                                                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${adminConfig?.moderators?.includes(selectedUser.userId)
                                                    ? 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                                    : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                    }`}
                                            >
                                                {adminConfig?.moderators?.includes(selectedUser.userId)
                                                    ? <><UserX className="w-4 h-4" /> Gỡ quyền Quản trị viên</>
                                                    : <><ShieldCheck className="w-4 h-4" /> Cấp quyền Quản trị viên</>
                                                }
                                            </button>


                                            {/* Delete actions */}
                                            <button
                                                onClick={() => { setDeleteType('kanji'); setConfirmDelete(selectedUser); }}
                                                className="w-full px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Languages className="w-4 h-4" /> Xóa dữ liệu Kanji SRS
                                            </button>
                                            <button
                                                onClick={() => { setDeleteType('all'); setConfirmDelete(selectedUser); }}
                                                className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Xóa toàn bộ dữ liệu
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Chọn một người dùng để xem chi tiết</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ==================== ONLINE SUPPORT SECTION ==================== */}
            {activeSection === 'support' && (
                <AdminSupportChatSection
                    users={users}
                    currentUserId={currentUserId}
                />
            )}

            {/* ==================== AI SETTINGS SECTION ==================== */}
            {activeSection === 'ai' && (
                <div className="space-y-4">
                    {/* AI Provider Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white">AI Provider: OpenRouter</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Sử dụng Gemini 2.5 Flash qua OpenRouter</p>
                            </div>
                        </div>

                        {/* OpenRouter Model Selection */}
                        <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-white mb-2">Mô hình OpenRouter</p>
                            <select
                                value={adminConfig?.openRouterModel || 'google/gemini-2.5-flash'}
                                onChange={(e) => handleChangeOpenRouterModel(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            >
                                {OPENROUTER_MODELS.map(model => (
                                    <option key={model.value} value={model.value}>{model.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>


                    {/* Info note */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>💡 Lưu ý:</strong> AI được kiểm soát bằng hệ thống lượt sử dụng. Tất cả người dùng có thể dùng AI trong giới hạn lượt. Quản lý lượt ở tab <strong>Gói & Lượt AI</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* ==================== MODERATORS SECTION ==================== */}
            {activeSection === 'moderators' && (
                <div className="space-y-4">
                    {/* Info Card */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5" /> Quản trị viên (Moderator)
                        </h3>
                        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 ml-7 list-disc">
                            <li>Có thể sử dụng tất cả tính năng AI</li>
                            <li>Có quyền tương đương admin trong ứng dụng</li>
                            <li><strong>Không</strong> được truy cập trang quản lý Admin này</li>
                        </ul>
                    </div>

                    {/* Current Moderators */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                            Danh sách Quản trị viên ({adminConfig?.moderators?.length || 0})
                        </h3>
                        {(!adminConfig?.moderators || adminConfig.moderators.length === 0) ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                Chưa có quản trị viên nào. Chọn người dùng ở tab "Người dùng" để cấp quyền.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {adminConfig.moderators.map(uid => {
                                    const user = users.find(u => u.userId === uid);
                                    return (
                                        <div key={uid} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                                                    {(user?.displayName || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white">
                                                        {user?.displayName || uid.slice(0, 15) + '...'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {user?.totalCards || 0} thẻ
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleModerator(uid, user?.displayName || uid)}
                                                disabled={savingConfig}
                                                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                Gỡ quyền
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Add Moderator - quick select from user list */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                            Thêm Quản trị viên
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                            {users.filter(u => u.userId !== currentUserId && !adminConfig?.moderators?.includes(u.userId)).map(user => (
                                <div key={user.userId} className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                            {(user.displayName || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm text-gray-800 dark:text-white">{user.displayName || 'Chưa đặt tên'}</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleModerator(user.userId, user.displayName)}
                                        disabled={savingConfig}
                                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                    >
                                        Cấp quyền
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${deleteType === 'kanji' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                <AlertTriangle className={`w-6 h-6 ${deleteType === 'kanji' ? 'text-orange-600' : 'text-red-600'}`} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Xác nhận xóa</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                {deleteType === 'kanji'
                                    ? <>Bạn có chắc muốn xóa <strong>dữ liệu Kanji SRS</strong> của <strong>{confirmDelete.displayName}</strong>?</>
                                    : <>Bạn có chắc muốn xóa <strong>toàn bộ dữ liệu</strong> của <strong>{confirmDelete.displayName}</strong>?</>
                                }
                                <br />Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setConfirmDelete(null); setDeleteType('all'); }}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1 ${deleteType === 'kanji' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== CREDITS SECTION ==================== */}
            {activeSection === 'credits' && (
                <div className="space-y-4">
                    {/* Manual Apply Package */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-500" />
                            Áp dụng gói học cho người dùng
                        </h3>

                        {/* Email search */}
                        <div className="mb-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={manualCreditEmailSearch}
                                    onChange={(e) => {
                                        setManualCreditEmailSearch(e.target.value);
                                        setManualCreditUserId('');
                                    }}
                                    placeholder="Tìm theo email hoặc tên người dùng..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Search results */}
                        {manualCreditEmailSearch.trim() && (
                            <div className="mb-3 max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                                {(() => {
                                    const q = manualCreditEmailSearch.toLowerCase().trim();
                                    const matched = users.filter(u =>
                                        (u.email || '').toLowerCase().includes(q) ||
                                        (u.displayName || '').toLowerCase().includes(q)
                                    );
                                    if (matched.length === 0) {
                                        return (
                                            <div className="p-3 text-center text-sm text-gray-400 italic">
                                                Không tìm thấy người dùng phù hợp
                                            </div>
                                        );
                                    }
                                    return matched.map(u => (
                                        <div
                                            key={u.userId}
                                            onClick={() => {
                                                setManualCreditUserId(u.userId);
                                                setManualCreditEmailSearch(u.email || u.displayName || '');
                                            }}
                                            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${manualCreditUserId === u.userId
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                                                }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {(u.displayName || '?')[0].toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm text-gray-800 dark:text-white truncate">
                                                    {u.displayName || 'Chưa đặt tên'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {u.email || 'Không có email'}
                                                </p>
                                            </div>
                                            {manualCreditUserId === u.userId && (
                                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}

                        {/* Selected user indicator */}
                        {manualCreditUserId && (() => {
                            const selectedUser = users.find(u => u.userId === manualCreditUserId);
                            return selectedUser ? (
                                <div className="mb-3 flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                        Đã chọn: {selectedUser.displayName || 'Chưa đặt tên'}
                                    </span>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-500">
                                        ({selectedUser.email || 'N/A'})
                                    </span>
                                    <button
                                        onClick={() => { setManualCreditUserId(''); setManualCreditEmailSearch(''); }}
                                        className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : null;
                        })()}

                        {/* Package Selector + Apply Button */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={selectedPackageId}
                                onChange={(e) => setSelectedPackageId(e.target.value)}
                                className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            >
                                <optgroup label="👑 Gói Premium (Tất cả tính năng)">
                                    <option value="premium">Gói Premium (Mở khóa tất cả)</option>
                                </optgroup>
                                <optgroup label="📖 Gói Lẻ (Môn học lẻ)">
                                    <option value="vocab_zen">Từ vựng Zen</option>
                                    <option value="grammar_zen">Ngữ pháp Zen</option>
                                    <option value="kanji_zen">Kanji Zen</option>
                                    <option value="jlpt_prep">Luyện thi JLPT</option>
                                </optgroup>
                                <optgroup label="🤖 Gói AI (Thêm lượt AI)">
                                    <option value="ai_starter">AI Starter (+100 lượt)</option>
                                    <option value="ai_popular">AI Popular (+500 lượt)</option>
                                    <option value="ai_best_value">AI Best Value (+1000 lượt)</option>
                                    <option value="ai_ultimate">AI Ultimate (+3000 lượt)</option>
                                </optgroup>
                            </select>
                            
                            <button
                                onClick={handleManualApplyPackage}
                                disabled={savingConfig || !manualCreditUserId || !selectedPackageId}
                                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Áp dụng gói
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== VOUCHER SECTION ==================== */}
            {activeSection === 'vouchers' && (
                <div className="space-y-4">
                    {/* Create Voucher */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-500" />
                            Tạo Voucher mới
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mã voucher</label>
                                    <input
                                        type="text"
                                        value={newVoucher.code}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                        placeholder="VD: SALE50, FREECREDIT"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none font-mono uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mô tả</label>
                                    <input
                                        type="text"
                                        value={newVoucher.description}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, description: e.target.value }))}
                                        placeholder="Giảm giá Tết 2026"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Loại giảm</label>
                                    <select
                                        value={newVoucher.discountType}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, discountType: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    >
                                        <option value="percent">% Phần trăm</option>
                                        <option value="fixed">VND Cố định</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                                        {newVoucher.discountType === 'percent' ? 'Giảm (%)' : 'Giảm (VND)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={newVoucher.discountValue}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, discountValue: e.target.value }))}
                                        placeholder={newVoucher.discountType === 'percent' ? '50' : '20000'}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Số lượt (0=∞)</label>
                                    <input
                                        type="number"
                                        value={newVoucher.maxUses}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, maxUses: e.target.value }))}
                                        placeholder="100"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Hết hạn</label>
                                    <input
                                        type="date"
                                        value={newVoucher.expiresAt}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, expiresAt: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            {voucherError && (
                                <p className="text-xs text-red-500 font-medium">{voucherError}</p>
                            )}
                            <button
                                onClick={async () => {
                                    setVoucherError('');
                                    if (!newVoucher.code.trim()) { setVoucherError('Nhập mã voucher'); return; }
                                    if (!newVoucher.discountValue || Number(newVoucher.discountValue) <= 0) { setVoucherError('Nhập giá trị giảm'); return; }
                                    if (newVoucher.discountType === 'percent' && Number(newVoucher.discountValue) > 100) { setVoucherError('Phần trăm giảm tối đa 100%'); return; }
                                    setSavingConfig(true);
                                    const result = await createVoucher({
                                        ...newVoucher,
                                        expiresAt: newVoucher.expiresAt ? new Date(newVoucher.expiresAt + 'T23:59:59').toISOString() : null,
                                    }, currentUserId);
                                    if (result.success) {
                                        setNotification({ type: 'success', message: `Đã tạo voucher ${newVoucher.code}` });
                                        setNewVoucher({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '', description: '' });
                                    } else {
                                        setVoucherError(result.error || 'Lỗi tạo voucher');
                                    }
                                    setSavingConfig(false);
                                }}
                                disabled={savingConfig}
                                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
                            >
                                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                                Tạo Voucher
                            </button>
                        </div>
                    </div>

                    {/* Voucher List */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-indigo-500" />
                            Danh sách Voucher ({vouchers.length})
                        </h3>
                        {vouchers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có voucher nào.</p>
                        ) : (
                            <div className="space-y-2">
                                {vouchers.map(v => {
                                    const isExpired = v.expiresAt && new Date() > (v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt));
                                    const isUsedUp = v.maxUses > 0 && v.usedCount >= v.maxUses;
                                    return (
                                        <div key={v.id} className={`p-3 rounded-xl border transition-all ${!v.active || isExpired || isUsedUp
                                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                                            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs ${v.active && !isExpired && !isUsedUp
                                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                        : 'bg-gray-400'
                                                        }`}>
                                                        {v.discountType === 'percent' ? `${v.discountValue}%` : `${Math.round(v.discountValue / 1000)}K`}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-white font-mono text-sm">{v.code}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs text-gray-500">
                                                                {v.discountType === 'percent' ? `Giảm ${v.discountValue}%` : `Giảm ${formatVND(v.discountValue)}`}
                                                            </span>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-gray-500">
                                                                Đã dùng: {v.usedCount || 0}{v.maxUses > 0 ? `/${v.maxUses}` : '/∞'}
                                                            </span>
                                                            {v.expiresAt && (
                                                                <>
                                                                    <span className="text-xs text-gray-400">•</span>
                                                                    <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                                                                        {isExpired ? 'Hết hạn' : `HSD: ${new Date(v.expiresAt?.toDate ? v.expiresAt.toDate() : v.expiresAt).toLocaleDateString('vi-VN')}`}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {v.description && (
                                                                <>
                                                                    <span className="text-xs text-gray-400">•</span>
                                                                    <span className="text-xs text-gray-400 italic">{v.description}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            setSavingConfig(true);
                                                            await toggleVoucher(v.code, !v.active);
                                                            setNotification({ type: 'success', message: v.active ? `Đã tắt voucher ${v.code}` : `Đã bật voucher ${v.code}` });
                                                            setSavingConfig(false);
                                                        }}
                                                        disabled={savingConfig}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        title={v.active ? 'Tắt voucher' : 'Bật voucher'}
                                                    >
                                                        {v.active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!await showConfirm(`Xóa voucher ${v.code}?`, { type: 'danger', confirmText: 'Xóa' })) return;
                                                            setSavingConfig(true);
                                                            await deleteVoucher(v.code);
                                                            setNotification({ type: 'success', message: `Đã xóa voucher ${v.code}` });
                                                            setSavingConfig(false);
                                                        }}
                                                        disabled={savingConfig}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Xóa voucher"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ==================== REVENUE / BUSINESS SECTION ==================== */}
            {activeSection === 'revenue' && (
                <div className="space-y-4">
                    {/* API Credits Monitor */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-cyan-500" />
                                Số dư API bên thứ 3
                            </h3>
                            <button
                                onClick={fetchApiBalances}
                                disabled={apiBalances.loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {apiBalances.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                {apiBalances.loading ? 'Đang tải...' : 'Kiểm tra'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* OpenRouter */}
                            <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">OpenRouter</span>
                                </div>
                                {apiBalances.openRouter === null ? (
                                    <p className="text-xs text-gray-400 italic">Nhấn "Kiểm tra" để xem số dư</p>
                                ) : apiBalances.openRouter.error ? (
                                    <p className="text-xs text-red-500">⚠️ {apiBalances.openRouter.error}</p>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Tổng nạp:</span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">${apiBalances.openRouter.totalCredits?.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Đã dùng:</span>
                                            <span className="text-xs font-bold text-orange-600">${apiBalances.openRouter.totalUsage?.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-indigo-200 dark:border-indigo-700">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Còn lại:</span>
                                            <span className={`text-sm font-bold ${apiBalances.openRouter.remaining > 1 ? 'text-emerald-600' : apiBalances.openRouter.remaining > 0.1 ? 'text-amber-600' : 'text-red-600'}`}>
                                                ${apiBalances.openRouter.remaining?.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SpeechGen */}
                            <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">🔊</span>
                                    </div>
                                    <span className="font-bold text-sm text-purple-700 dark:text-purple-300">SpeechGen.io</span>
                                </div>
                                {apiBalances.speechGen === null ? (
                                    <p className="text-xs text-gray-400 italic">Nhấn "Kiểm tra" để xem số dư</p>
                                ) : apiBalances.speechGen.error ? (
                                    <p className="text-xs text-red-500">⚠️ {apiBalances.speechGen.error}</p>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex justify-between pt-1">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Số ký tự còn lại:</span>
                                            <span className={`text-sm font-bold ${(apiBalances.speechGen.balance || 0) > 10000 ? 'text-emerald-600' : (apiBalances.speechGen.balance || 0) > 1000 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {apiBalances.speechGen.balance != null ? Number(apiBalances.speechGen.balance).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">1 ký tự = 1 limit (giọng Pro)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Month Selector */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                Thống kê theo tháng
                            </h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                />
                                <button
                                    onClick={() => {
                                        // Gather data for Excel
                                        const monthTxs = creditRequests.filter(r => {
                                            if (r.status !== 'approved') return false;
                                            const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                                            if (!date) return false;
                                            return date.toISOString().slice(0, 7) === selectedMonth;
                                        });
                                        const monthExps = expenses.filter(exp => {
                                            if (exp.recurring === 'monthly') return true;
                                            if (exp.recurring === 'yearly') return (exp.month || '').slice(5, 7) === selectedMonth.slice(5, 7);
                                            return exp.month === selectedMonth;
                                        });
                                        const totalRevenue = monthTxs.reduce((s, r) => s + (r.amount || 0), 0);
                                        const totalFixed = monthExps.filter(e => e.type === 'fixed').reduce((s, e) => s + (e.amount || 0), 0);
                                        const totalOp = monthExps.filter(e => e.type === 'operating').reduce((s, e) => s + (e.amount || 0), 0);
                                        const totalOther = monthExps.filter(e => e.type === 'other').reduce((s, e) => s + (e.amount || 0), 0);
                                        const totalExp = totalFixed + totalOp + totalOther;
                                        const profit = totalRevenue - totalExp;

                                        // Sheet 1: Tổng quan
                                        const summaryData = [
                                            ['BÁO CÁO DOANH THU THÁNG', selectedMonth],
                                            [],
                                            ['Hạng mục', 'Số tiền (VND)'],
                                            ['Doanh thu', totalRevenue],
                                            ['Chi phí cố định', totalFixed],
                                            ['Chi phí vận hành', totalOp],
                                            ['Chi phí khác', totalOther],
                                            ['Tổng chi phí', totalExp],
                                            [],
                                            ['LỢI NHUẬN RÒNG', profit],
                                            [],
                                            ['Số giao dịch', monthTxs.length],
                                        ];
                                        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
                                        ws1['!cols'] = [{ wch: 25 }, { wch: 20 }];

                                        // Sheet 2: Giao dịch
                                        const txHeaders = ['STT', 'Ngày', 'Người dùng', 'Email', 'Gói', 'Số thẻ', 'Số tiền (VND)'];
                                        const txRows = monthTxs.map((r, i) => {
                                            const date = r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt);
                                            const user = users.find(u => u.userId === r.userId);
                                            return [i + 1, date.toLocaleDateString('vi-VN'), user?.displayName || r.userName || 'N/A', user?.email || r.userEmail || '', r.packageName || r.packageId, r.credits || 0, r.amount || 0];
                                        });
                                        const ws2 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
                                        ws2['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

                                        // Sheet 3: Chi phí
                                        const expHeaders = ['STT', 'Tên', 'Loại', 'Chu kỳ', 'Tháng', 'Số tiền (VND)', 'Ghi chú'];
                                        const typeMap = { fixed: 'Cố định', operating: 'Vận hành', other: 'Khác' };
                                        const recurMap = { monthly: 'Hàng tháng', yearly: 'Hàng năm', once: 'Một lần' };
                                        const expRows = monthExps.map((e, i) => [i + 1, e.name, typeMap[e.type] || e.type, recurMap[e.recurring] || e.recurring, e.month, e.amount || 0, e.description || '']);
                                        const ws3 = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
                                        ws3['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }];

                                        // Create workbook
                                        const wb = XLSX.utils.book_new();
                                        XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');
                                        XLSX.utils.book_append_sheet(wb, ws2, 'Giao dịch');
                                        XLSX.utils.book_append_sheet(wb, ws3, 'Chi phí');
                                        XLSX.writeFile(wb, `DoanhThu_${selectedMonth}.xlsx`);
                                        setNotification({ type: 'success', message: `Đã xuất Excel tháng ${selectedMonth}` });
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors"
                                    title="Xuất Excel"
                                >
                                    <Download className="w-4 h-4" />
                                    Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Stats Cards */}
                    {(() => {
                        // Revenue from approved credit requests in selected month
                        const monthRevenue = creditRequests
                            .filter(r => {
                                if (r.status !== 'approved') return false;
                                const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                                if (!date) return false;
                                return date.toISOString().slice(0, 7) === selectedMonth;
                            })
                            .reduce((sum, r) => sum + (r.amount || 0), 0);

                        const monthTransactions = creditRequests.filter(r => {
                            if (r.status !== 'approved') return false;
                            const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                            if (!date) return false;
                            return date.toISOString().slice(0, 7) === selectedMonth;
                        }).length;

                        // Expenses for selected month (recurring monthly expenses always count)
                        const monthExpenses = expenses.filter(exp => {
                            if (exp.recurring === 'monthly') return true;
                            if (exp.recurring === 'yearly') {
                                const createdMonth = exp.month || '';
                                return createdMonth.slice(5, 7) === selectedMonth.slice(5, 7);
                            }
                            return exp.month === selectedMonth;
                        });

                        const totalFixedCost = monthExpenses.filter(e => e.type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);
                        const totalOperatingCost = monthExpenses.filter(e => e.type === 'operating').reduce((sum, e) => sum + (e.amount || 0), 0);
                        const totalOtherCost = monthExpenses.filter(e => e.type === 'other').reduce((sum, e) => sum + (e.amount || 0), 0);
                        const totalExpenses = totalFixedCost + totalOperatingCost + totalOtherCost;
                        const profit = monthRevenue - totalExpenses;

                        // All-time stats
                        const allTimeRevenue = creditRequests
                            .filter(r => r.status === 'approved')
                            .reduce((sum, r) => sum + (r.amount || 0), 0);

                        return (
                            <>
                                {/* Overview Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold text-emerald-600">{formatVND(monthRevenue)}</p>
                                        <p className="text-[10px] text-gray-500">Doanh thu tháng</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                <TrendingDown className="w-4 h-4 text-red-600" />
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold text-red-600">{formatVND(totalExpenses)}</p>
                                        <p className="text-[10px] text-gray-500">Chi phí tháng</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profit >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                                                <DollarSign className={`w-4 h-4 ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                            </div>
                                        </div>
                                        <p className={`text-lg font-bold ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{profit >= 0 ? '+' : ''}{formatVND(profit)}</p>
                                        <p className="text-[10px] text-gray-500">{profit >= 0 ? 'Lợi nhuận' : 'Lỗ'} tháng</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                <CreditCard className="w-4 h-4 text-purple-600" />
                                            </div>
                                        </div>
                                        <p className="text-lg font-bold text-purple-600">{formatVND(allTimeRevenue)}</p>
                                        <p className="text-[10px] text-gray-500">Tổng doanh thu</p>
                                    </div>
                                </div>

                                {/* Expense Breakdown */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                                        Chi tiết thu chi tháng {selectedMonth}
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Revenue detail */}
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">📈 Doanh thu</span>
                                                <span className="text-sm font-bold text-emerald-600">{formatVND(monthRevenue)}</span>
                                            </div>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-500">{monthTransactions} giao dịch thanh toán</p>
                                        </div>

                                        {/* Expenses detail */}
                                        {totalFixedCost > 0 && (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">🏢 Chi phí cố định</span>
                                                    <span className="text-sm font-bold text-blue-600">-{formatVND(totalFixedCost)}</span>
                                                </div>
                                            </div>
                                        )}
                                        {totalOperatingCost > 0 && (
                                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">⚙️ Chi phí vận hành</span>
                                                    <span className="text-sm font-bold text-amber-600">-{formatVND(totalOperatingCost)}</span>
                                                </div>
                                            </div>
                                        )}
                                        {totalOtherCost > 0 && (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400">📦 Chi phí khác</span>
                                                    <span className="text-sm font-bold text-gray-600">-{formatVND(totalOtherCost)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Profit line */}
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white">{profit >= 0 ? '✅ Lợi nhuận ròng' : '⚠️ Lỗ ròng'}</span>
                                                <span className={`text-base font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{profit >= 0 ? '+' : ''}{formatVND(profit)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Transactions */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        Giao dịch tháng {selectedMonth} ({monthTransactions})
                                    </h3>
                                    {monthTransactions === 0 ? (
                                        <p className="text-sm text-gray-400 italic text-center py-4">Chưa có giao dịch nào trong tháng này.</p>
                                    ) : (
                                        <div className="max-h-[250px] overflow-y-auto space-y-1.5">
                                            {creditRequests
                                                .filter(r => {
                                                    if (r.status !== 'approved') return false;
                                                    const date = r.processedAt?.toDate ? r.processedAt.toDate() : (r.processedAt ? new Date(r.processedAt) : null);
                                                    if (!date) return false;
                                                    return date.toISOString().slice(0, 7) === selectedMonth;
                                                })
                                                .map(r => {
                                                    const date = r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt);
                                                    const user = users.find(u => u.userId === r.userId);
                                                    return (
                                                        <div key={r.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                                    {(user?.displayName || r.userName || '?')[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-gray-800 dark:text-white">{user?.displayName || r.userName || 'N/A'}</p>
                                                                    <p className="text-[10px] text-gray-400">{r.packageName || r.packageId} • {r.credits} thẻ</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs font-bold text-emerald-600">+{formatVND(r.amount || 0)}</p>
                                                                <p className="text-[10px] text-gray-400">{date.toLocaleDateString('vi-VN')}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()}

                    {/* Add Expense */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-red-500" />
                            Thêm chi phí
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tên chi phí</label>
                                    <input
                                        type="text"
                                        value={newExpense.name}
                                        onChange={(e) => setNewExpense(v => ({ ...v, name: e.target.value }))}
                                        placeholder="VD: Hosting, API, Domain..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Số tiền (VND)</label>
                                    <input
                                        type="text" inputMode="numeric"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense(v => ({ ...v, amount: e.target.value }))}
                                        placeholder="50000"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Loại</label>
                                    <select
                                        value={newExpense.type}
                                        onChange={(e) => setNewExpense(v => ({ ...v, type: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    >
                                        <option value="fixed">🏢 Cố định</option>
                                        <option value="operating">⚙️ Vận hành</option>
                                        <option value="other">📦 Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Chu kỳ</label>
                                    <select
                                        value={newExpense.recurring}
                                        onChange={(e) => setNewExpense(v => ({ ...v, recurring: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    >
                                        <option value="monthly">Hàng tháng</option>
                                        <option value="yearly">Hàng năm</option>
                                        <option value="once">Một lần</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tháng</label>
                                    <input
                                        type="month"
                                        value={newExpense.month}
                                        onChange={(e) => setNewExpense(v => ({ ...v, month: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Ghi chú</label>
                                <input
                                    type="text"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense(v => ({ ...v, description: e.target.value }))}
                                    placeholder="Mô tả chi phí (tùy chọn)"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                />
                            </div>
                            {expenseError && (
                                <p className="text-xs text-red-500 font-medium">{expenseError}</p>
                            )}
                            <button
                                onClick={async () => {
                                    setExpenseError('');
                                    if (!newExpense.name.trim()) { setExpenseError('Nhập tên chi phí'); return; }
                                    if (!newExpense.amount || Number(newExpense.amount) <= 0) { setExpenseError('Nhập số tiền hợp lệ'); return; }
                                    setSavingConfig(true);
                                    const result = await addExpense(newExpense, currentUserId);
                                    if (result.success) {
                                        setNotification({ type: 'success', message: `Đã thêm chi phí: ${newExpense.name}` });
                                        setNewExpense({ name: '', amount: '', type: 'operating', recurring: 'monthly', description: '', month: new Date().toISOString().slice(0, 7) });
                                    } else {
                                        setExpenseError(result.error || 'Lỗi thêm chi phí');
                                    }
                                    setSavingConfig(false);
                                }}
                                disabled={savingConfig}
                                className="w-full py-2.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-red-600 hover:to-orange-700 disabled:opacity-50 transition-all"
                            >
                                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Thêm chi phí
                            </button>
                        </div>
                    </div>

                    {/* Expense List */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            Danh sách chi phí ({expenses.length})
                        </h3>
                        {expenses.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có chi phí nào.</p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {expenses.map(exp => {
                                    const typeLabel = exp.type === 'fixed' ? '🏢 Cố định' : exp.type === 'operating' ? '⚙️ Vận hành' : '📦 Khác';
                                    const recurLabel = exp.recurring === 'monthly' ? 'Hàng tháng' : exp.recurring === 'yearly' ? 'Hàng năm' : 'Một lần';
                                    const typeBg = exp.type === 'fixed' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : exp.type === 'operating' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700';
                                    return (
                                        <div key={exp.id} className={`p-3 rounded-xl border ${typeBg}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{exp.name}</p>
                                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                        <span className="text-xs text-gray-500">{typeLabel}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500">{recurLabel}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500">{exp.month}</span>
                                                        {exp.description && (
                                                            <>
                                                                <span className="text-xs text-gray-400">•</span>
                                                                <span className="text-xs text-gray-400 italic">{exp.description}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-red-600">-{formatVND(exp.amount || 0)}</span>
                                                    <button
                                                        onClick={async () => {
                                                            if (!await showConfirm(`Xóa chi phí "${exp.name}"?`, { type: 'danger', confirmText: 'Xóa' })) return;
                                                            setSavingConfig(true);
                                                            await deleteExpense(exp.id);
                                                            setNotification({ type: 'success', message: `Đã xóa chi phí ${exp.name}` });
                                                            setSavingConfig(false);
                                                        }}
                                                        disabled={savingConfig}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== SYSTEM & NOTIFICATIONS SECTION ==================== */}
            {activeSection === 'system' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Maintenance Mode setting card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-500" />
                                Bảo trì hệ thống
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                Khi kích hoạt chế độ bảo trì, chỉ có tài khoản Admin mới có thể truy cập được ứng dụng. Người dùng thông thường khi vào QuizKi sẽ thấy màn hình thông báo bảo trì.
                            </p>
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">Trạng thái bảo trì</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {adminConfig?.maintenanceMode ? 'Đang bật' : 'Đang tắt'}
                                    </span>
                                </div>
                                <button
                                    onClick={async () => {
                                        setSavingConfig(true);
                                        const newStatus = !adminConfig?.maintenanceMode;
                                        const ok = await updateAdminConfig({ maintenanceMode: newStatus }, currentUserId);
                                        if (ok) {
                                            setNotification({ 
                                                type: 'success', 
                                                message: newStatus ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì' 
                                            });
                                        } else {
                                            setNotification({ type: 'error', message: 'Lỗi khi cập nhật trạng thái bảo trì' });
                                        }
                                        setSavingConfig(false);
                                    }}
                                    disabled={savingConfig}
                                    className="p-1 rounded-full cursor-pointer focus:outline-none transition-colors"
                                >
                                    {adminConfig?.maintenanceMode ? (
                                        <ToggleRight className="w-12 h-12 text-[#2E5B70] dark:text-sky-400" />
                                    ) : (
                                        <ToggleLeft className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Global notification creation card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-indigo-500" />
                            Gửi thông báo hệ thống
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Gửi một thông báo chung tới hộp thư của tất cả người dùng trên hệ thống.
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Tiêu đề thông báo</label>
                                <input
                                    type="text"
                                    value={newNotificationText.title}
                                    onChange={(e) => setNewNotificationText(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ví dụ: Cập nhật tính năng mới..."
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-gray-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Nội dung thông báo</label>
                                <textarea
                                    value={newNotificationText.message}
                                    onChange={(e) => setNewNotificationText(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Nhập nội dung chi tiết..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-gray-800 dark:text-white resize-none"
                                />
                            </div>

                            {notificationError && (
                                <p className="text-xs text-red-500 font-medium">{notificationError}</p>
                            )}

                            <button
                                onClick={handleSendNotification}
                                disabled={sendingNotification || !newNotificationText.title.trim() || !newNotificationText.message.trim()}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                            >
                                {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Gửi thông báo
                            </button>
                        </div>
                    </div>

                    {/* Notification History card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:col-span-2">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" />
                            Lịch sử thông báo đã gửi
                        </h3>
                        {globalNotifications.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                Chưa có thông báo nào được gửi.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {globalNotifications.map(notif => (
                                    <div key={notif.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate">{notif.title}</h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{notif.message}</p>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block">
                                                Gửi vào: {new Date(notif.createdAt).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (await showConfirm('Bạn có chắc chắn muốn xóa thông báo này?', { type: 'danger', confirmText: 'Xóa' })) {
                                                    await handleDeleteNotification(notif.id);
                                                }
                                            }}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex-shrink-0"
                                            title="Xóa thông báo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${notification.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}
        </div>
    );
};

// ==================== ADMIN SUPPORT CHAT SECTION ====================
const AdminSupportChatSection = ({ users, currentUserId }) => {
    const [threads, setThreads] = React.useState([]);
    const [selectedUserId, setSelectedUserId] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [replyText, setReplyText] = React.useState('');
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [sending, setSending] = React.useState(false);
    const [loadingThreads, setLoadingThreads] = React.useState(true);
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    
    const messagesEndRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const chatPath = `artifacts/${appId}/public/data/feedbacks`;

    const fetchThreads = React.useCallback(async (showLoader = false) => {
        if (!db) return;
        if (showLoader) setLoadingThreads(true);
        try {
            const q = query(
                collection(db, `artifacts/${appId}/forum`),
                where('isSupportChat', '==', true)
            );
            const snapshot = await getDocs(q);
            
            const threadList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    userId: data.userId,
                    displayName: data.senderName || 'Người dùng ẩn danh',
                    email: data.email || '',
                    lastMessage: {
                        text: data.text || '',
                        createdAt: data.updatedAt,
                        isAdmin: data.isAdminReply
                    }
                };
            });

            // Sort threads by last message time (updatedAt)
            threadList.sort((a, b) => {
                const aTime = a.lastMessage.createdAt?.toDate ? a.lastMessage.createdAt.toDate().getTime() : (a.lastMessage.createdAt || 0);
                const bTime = b.lastMessage.createdAt?.toDate ? b.lastMessage.createdAt.toDate().getTime() : (b.lastMessage.createdAt || 0);
                return bTime - aTime;
            });

            setThreads(threadList);
        } catch (error) {
            console.error("Error fetching admin support threads:", error);
        } finally {
            if (showLoader) setLoadingThreads(false);
        }
    }, [users]);

    // Load all support messages and group them into threads on mount and polling
    React.useEffect(() => {
        fetchThreads(true);
        const interval = setInterval(() => {
            fetchThreads(false);
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchThreads]);

    const fetchMessages = React.useCallback(async (showLoader = false) => {
        if (!selectedUserId || !db) {
            setMessages([]);
            return;
        }

        if (showLoader) setLoadingMessages(true);
        try {
            const q = collection(db, `artifacts/${appId}/forum/support_chat_${selectedUserId}/comments`);
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort client-side by createdAt
            list.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return aTime - bTime;
            });

            setMessages(list);
            
            // Scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error("Error fetching chat messages for user:", selectedUserId, error);
        } finally {
            if (showLoader) setLoadingMessages(false);
        }
    }, [selectedUserId]);

    // Load messages of selected thread
    React.useEffect(() => {
        fetchMessages(true);
        const interval = setInterval(() => {
            fetchMessages(false);
        }, 4000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Handle image select
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1.2 * 1024 * 1024) {
            alert('Hình ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 1.2 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Send reply
    const handleSendReply = async (e) => {
        e.preventDefault();
        if ((!replyText.trim() && !selectedImage) || sending || !selectedUserId) return;

        setSending(true);
        const textToSend = replyText.trim();
        const imageToSend = selectedImage;

        setReplyText('');
        setSelectedImage(null);

        try {
            // 1. Add comment/message to the subcollection
            await addDoc(collection(db, `artifacts/${appId}/forum/support_chat_${selectedUserId}/comments`), {
                userId: selectedUserId,
                senderId: currentUserId,
                senderName: 'Ban quản trị QuizKi',
                text: textToSend,
                imageUrl: imageToSend || null,
                isAdmin: true,
                isSupportChat: true,
                createdAt: serverTimestamp()
            });

            // 2. Update status doc
            const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${selectedUserId}`);
            await setDoc(statusDocRef, {
                isSupportChat: true,
                userId: selectedUserId,
                text: textToSend,
                isAdminReply: true,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Fetch immediately
            fetchMessages(false);
            fetchThreads(false);
        } catch (error) {
            console.error("Error sending admin reply:", error);
            setReplyText(textToSend);
            setSelectedImage(imageToSend);
            alert("Lỗi khi gửi phản hồi.");
        } finally {
            setSending(false);
        }
    };

    const selectedThread = threads.find(t => t.userId === selectedUserId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] shadow-sm">
            {/* Thread List */}
            <div className="border-r border-gray-100 dark:border-gray-700 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/30 font-sans">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="font-bold text-gray-850 dark:text-white flex items-center gap-2 text-xs">
                        <MessageSquare className="w-5 h-5 text-[#2E5B70]" />
                        Hội thoại hỗ trợ ({threads.length})
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-750">
                    {loadingThreads ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#2E5B70] mx-auto" />
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs italic">
                            Chưa có yêu cầu hỗ trợ nào.
                        </div>
                    ) : (
                        threads.map(thread => {
                            const isSelected = thread.userId === selectedUserId;
                            const needsReply = !thread.lastMessage.isAdmin;
                            return (
                                <div
                                    key={thread.userId}
                                    onClick={() => setSelectedUserId(thread.userId)}
                                    className={`p-4 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-all flex items-start gap-3 relative ${
                                        isSelected ? 'bg-white dark:bg-gray-800 border-l-4 border-[#2E5B70]' : ''
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[#2E5B70]/10 dark:bg-[#2E5B70]/20 flex items-center justify-center font-bold text-[#2E5B70] dark:text-[#3B728C] flex-shrink-0">
                                        {(thread.displayName || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate pr-2">
                                                {thread.displayName}
                                            </p>
                                            {thread.lastMessage.createdAt && (
                                                <span className="text-[10px] text-gray-455 whitespace-nowrap">
                                                    {thread.lastMessage.createdAt.toDate ? thread.lastMessage.createdAt.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs truncate ${needsReply ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {thread.lastMessage.isAdmin ? 'Bạn: ' : ''}{thread.lastMessage.text || '[Hình ảnh]'}
                                        </p>
                                    </div>
                                    {needsReply && (
                                        <span className="absolute top-4 right-4 w-2 h-2 bg-[#2E5B70] rounded-full animate-pulse" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Pane */}
            <div className="lg:col-span-2 flex flex-col h-full bg-white dark:bg-gray-800 font-sans">
                {selectedThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-105 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-xs">
                                    {selectedThread.displayName}
                                </h4>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                    Email: {selectedThread.email || 'N/A'} | ID: {selectedThread.userId}
                                </p>
                            </div>
                        </div>

                        {/* Message Stream */}
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 space-y-3">
                            {loadingMessages ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#2E5B70]" />
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isSelf = msg.isAdmin;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                                        >
                                            <span className="text-[9px] text-slate-400 font-bold mb-0.5 px-1">
                                                {isSelf ? 'Ban quản trị' : selectedThread.displayName}
                                            </span>
                                            <div
                                                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                                                    isSelf
                                                        ? 'bg-[#2E5B70] text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-150/40 dark:border-slate-700/50'
                                                }`}
                                            >
                                                {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                                                {msg.imageUrl && (
                                                    <div className="mt-2 rounded-lg overflow-hidden border border-black/5 dark:border-white/5 max-w-[260px]">
                                                        <img 
                                                            src={msg.imageUrl} 
                                                            alt="Đính kèm" 
                                                            className="w-full h-auto object-cover max-h-56 cursor-pointer"
                                                            onClick={() => window.open(msg.imageUrl, '_blank')}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Image Preview */}
                        {selectedImage && (
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <img src={selectedImage} className="w-14 h-14 object-cover rounded-md border border-gray-200" alt="Preview" />
                                    <span className="text-xs text-slate-400 font-medium">Đính kèm 1 ảnh</span>
                                </div>
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 rounded-full cursor-pointer"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <form onSubmit={handleSendReply} className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                title="Đính kèm hình ảnh"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="flex-1 py-2.5 px-4 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#2E5B70] text-slate-850 dark:text-slate-200"
                                placeholder="Gõ câu trả lời của bạn..."
                            />

                            <button
                                type="submit"
                                disabled={(!replyText.trim() && !selectedImage) || sending}
                                className="px-4 py-2.5 bg-[#2E5B70] hover:bg-[#203F4F] text-white rounded-xl font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                {sending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        Gửi phản hồi
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                        <MessageSquare className="w-16 h-16 opacity-30 mb-3" />
                        <p className="text-sm font-semibold">Chưa chọn hội thoại nào</p>
                        <p className="text-xs text-gray-455 dark:text-gray-500 max-w-sm mt-1">
                            Chọn một người dùng từ danh sách bên trái để bắt đầu hỗ trợ trực tuyến.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminScreen;
