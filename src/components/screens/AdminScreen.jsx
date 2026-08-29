import React, { useState, useEffect } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db, appId, storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Users, Shield, CheckCircle, AlertTriangle, BookOpen, Bot, Settings, Ticket, DollarSign, ShieldCheck, MessageSquare } from 'lucide-react';
import { updateAdminConfig, AI_PROVIDER_OPTIONS, OPENROUTER_MODELS, AI_FEATURES, addModerator, removeModerator, sendGlobalNotification, deleteGlobalNotification } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';
import { playAudio } from '../../utils/audio';
import { syncKanjiAndVocabToCDN } from '../../utils/kanjiService';

// Subcomponents
import AdminUsersSection from '../admin/AdminUsersSection';
import AdminAiSection from '../admin/AdminAiSection';
import AdminVouchersSection from '../admin/AdminVouchersSection';
import AdminRevenueSection from '../admin/AdminRevenueSection';
import AdminVocabularySection from '../admin/AdminVocabularySection';
import AdminModeratorsSection from '../admin/AdminModeratorsSection';
import AdminSystemSection from '../admin/AdminSystemSection';
import AdminSupportChatSection from '../admin/AdminSupportChatSection';

// Modals
import AdminDeleteUserModal from '../admin/AdminDeleteUserModal';
import AdminEditDictModal from '../admin/AdminEditDictModal';
import AdminDeleteDictModal from '../admin/AdminDeleteDictModal';

// Hooks
import { useAdminData } from '../../hooks/useAdminData';
import { useAdminVocabulary } from '../../hooks/useAdminVocabulary';

const AdminScreen = ({ publicStatsPath, currentUserId, onAdminDeleteUserData, adminConfig }) => {
    const [activeSection, setActiveSection] = useState('users');
    const [savingConfig, setSavingConfig] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [apiBalances, setApiBalances] = useState({ openRouter: null, speechGen: null, loading: false, error: '' });

    // Global notifications & maintenance states
    const [newNotificationText, setNewNotificationText] = useState({ title: '', message: '', link: '' });
    const [notificationError, setNotificationError] = useState('');
    const [sendingNotification, setSendingNotification] = useState(false);
    const [notificationType, setNotificationType] = useState('normal');
    const [maintenanceMsg, setMaintenanceMsg] = useState(adminConfig?.maintenanceMessage || '');

    // Cache Sync States
    const [syncingCache, setSyncingCache] = useState({ kanji: false, books: false, grammar: false, jlpt: false, all: false });
    const [syncProgress, setSyncProgress] = useState('');

    // Custom Data Hooks
    const {
        users, isLoading, searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
        selectedUser, selectedUserProfile, selectedUserPackageState, setSelectedUserPackageState,
        updatingUserPackage, loadingProfile, notification, setNotification, confirmDelete, setConfirmDelete,
        deleting, deleteType, setDeleteType, roleFilter, setRoleFilter, planFilter, setPlanFilter,
        creditRequests, vouchers, expenses, globalNotifications, cacheConfig, getUserActivePlan,
        handleSaveUserPackage, stats, filteredUsers, handleDelete, getUserPlans, kanjiStats, formatVND, handleSelectUser,
        handleSyncUserByUidOrEmail, handleSyncAllUsersFromFirestore, isSyncingAllUsers
    } = useAdminData({ publicStatsPath, currentUserId, adminConfig, onAdminDeleteUserData });

    const {
        dictResults, isLoadingDict, dictLevelFilter, setDictLevelFilter, dictPosFilter, setDictPosFilter,
        dictErrorReportedFilter, setDictErrorReportedFilter, dictKanjiFilter, setDictKanjiFilter,
        dictSearchQuery, setDictSearchQuery, visibleLimit, setVisibleLimit, dictLangTab, setDictLangTab,
        jaCount, enCount, isClearingDict, isBulkRecreating, bulkProgress, editingDictItem, setEditingDictItem,
        deletingDictItem, setDeletingDictItem, recreatingVocabId, originalAudioBase64, filteredDictResults,
        handleSaveDictItem, handleOpenEditModal, handleDeleteDictItem, handleAiRecreateVocabulary,
        handleBulkAiRecreate, handleCancelBulkRecreate, handleClearSharedVocabCollection
    } = useAdminVocabulary({ activeSection, setNotification });

    // Sync maintenance message from adminConfig props
    useEffect(() => {
        if (adminConfig?.maintenanceMessage !== undefined) {
            setMaintenanceMsg(adminConfig.maintenanceMessage || '');
        }
    }, [adminConfig?.maintenanceMessage]);

    // Fetch API balances
    const fetchApiBalances = async () => {
        setApiBalances(prev => ({ ...prev, loading: true, error: '' }));
        const results = { openRouter: null, speechGen: null, loading: false, error: '' };

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

        try {
            const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
            const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
            if (proxyUrl) {
                const baseProxy = proxyUrl.replace(/\/+$/, '');
                const res = await fetch(`${baseProxy}/status`);
                if (res.ok) {
                    const data = await res.json();
                    results.speechGen = { balance: 'Active', isAzure: true, isProxy: true, region: data.region || 'Unknown' };
                } else {
                    const errData = await res.json().catch(() => ({}));
                    results.speechGen = { error: `Proxy Error: HTTP ${res.status}${errData.error ? ` - ${errData.error}` : ''}` };
                }
            } else if (azureKey) {
                results.speechGen = { balance: 'Active', isAzure: true };
            } else {
                results.speechGen = { error: 'Chưa cấu hình API key hoặc Proxy URL Azure' };
            }
        } catch (e) {
            results.speechGen = { error: e.message };
        }

        setApiBalances(results);
    };

    // AI & Moderator Settings Handlers
    const handleChangeFeatureModel = async (featureId, model) => {
        setSavingConfig(true);
        const updatedFeatureModels = { ...(adminConfig?.aiFeatureModels || {}), [featureId]: model };
        const ok = await updateAdminConfig({ aiFeatureModels: updatedFeatureModels }, currentUserId);
        if (ok) {
            setNotification({
                type: 'success',
                message: `Đã đổi model cho "${AI_FEATURES.find(f => f.id === featureId)?.label || featureId}" sang ${OPENROUTER_MODELS.find(m => m.value === model)?.label || model}`
            });
        } else {
            setNotification({ type: 'error', message: 'Lỗi khi cập nhật model cho tính năng' });
        }
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

    // Cache Sync Handlers
    const fetchAllBooksData = async () => {
        const COLLECTION = 'bookGroups';
        const groupsSnap = await getDocs(collection(db, COLLECTION));
        const groups = await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
            const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };
            const booksSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books'));
            group.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
                const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };
                const chaptersSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters'));
                book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
                    const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };
                    const lessonsSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons'));
                    chapter.lessons = lessonsSnap.docs.map(lessonDoc => ({ id: lessonDoc.id, _docPath: lessonDoc.ref.path, ...lessonDoc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
                    return chapter;
                }));
                book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
                return book;
            }));
            group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
            return group;
        }));
        groups.sort((a, b) => (a.order || 0) - (b.order || 0));
        return groups;
    };

    const fetchAllGrammarData = async () => {
        const textbooksPath = `artifacts/${appId}/grammarTextbooks`;
        const textbooksSnap = await getDocs(collection(db, textbooksPath));
        const textbooks = await Promise.all(textbooksSnap.docs.map(async (tbDoc) => {
            const tb = { id: tbDoc.id, ...tbDoc.data(), lessons: [] };
            const lessonsSnap = await getDocs(collection(db, `${textbooksPath}/${tbDoc.id}/lessons`));
            tb.lessons = await Promise.all(lessonsSnap.docs.map(async (lessonDoc) => {
                const lesson = { id: lessonDoc.id, ...lessonDoc.data(), points: [] };
                const pointsSnap = await getDocs(collection(db, `${textbooksPath}/${tbDoc.id}/lessons/${lessonDoc.id}/points`));
                lesson.points = pointsSnap.docs.map(pDoc => ({ id: pDoc.id, ...pDoc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
                return lesson;
            }));
            tb.lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
            return tb;
        }));
        textbooks.sort((a, b) => (a.order || 0) - (b.order || 0));
        return textbooks;
    };

    const fetchAllJlptTestsData = async () => {
        const testsPath = `artifacts/${appId}/jlptTests`;
        const snap = await getDocs(collection(db, testsPath));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    };

    const uploadCacheFile = async (fileName, data) => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const fileRef = ref(storage, `cache/${appId}/${fileName}`);
        await uploadBytes(fileRef, blob);
        return getDownloadURL(fileRef);
    };

    const syncKanjiAndVocab = async (silent = false, forceFull = false) => {
        if (!silent) {
            setSyncingCache(prev => ({ ...prev, kanji: true }));
            setSyncProgress('Đang đồng bộ dữ liệu Kanji & Từ vựng lên CDN...');
        }
        try {
            const result = await syncKanjiAndVocabToCDN(forceFull);
            if (!silent) setNotification({ type: 'success', message: 'Đồng bộ Kanji & Từ vựng thành công!' });
            return result;
        } catch (error) {
            console.error('Error syncing Kanji & Vocab:', error);
            if (!silent) setNotification({ type: 'error', message: 'Lỗi khi đồng bộ Kanji & Từ vựng: ' + error.message });
            throw error;
        } finally {
            if (!silent) {
                setSyncingCache(prev => ({ ...prev, kanji: false }));
                setSyncProgress('');
            }
        }
    };

    const syncBooks = async (silent = false) => {
        if (!silent) {
            setSyncingCache(prev => ({ ...prev, books: true }));
            setSyncProgress('Đang tải dữ liệu Kho sách từ Firestore...');
        }
        try {
            const booksData = await fetchAllBooksData();
            if (!silent) setSyncProgress('Đang tải file Kho sách lên Cloud Storage CDN...');
            const booksUrl = await uploadCacheFile('books_data.json', booksData);
            const exportedAt = Date.now();
            await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { booksUrl, exportedAt }, { merge: true });
            if (!silent) setNotification({ type: 'success', message: 'Đồng bộ Kho sách thành công!' });
            return { booksUrl, exportedAt };
        } catch (error) {
            console.error('Error syncing books:', error);
            if (!silent) setNotification({ type: 'error', message: 'Lỗi khi đồng bộ Kho sách: ' + error.message });
            throw error;
        } finally {
            if (!silent) {
                setSyncingCache(prev => ({ ...prev, books: false }));
                setSyncProgress('');
            }
        }
    };

    const syncGrammar = async (silent = false) => {
        if (!silent) {
            setSyncingCache(prev => ({ ...prev, grammar: true }));
            setSyncProgress('Đang tải dữ liệu Ngữ pháp từ Firestore...');
        }
        try {
            const grammarData = await fetchAllGrammarData();
            if (!silent) setSyncProgress('Đang tải file Ngữ pháp lên Cloud Storage CDN...');
            const grammarUrl = await uploadCacheFile('grammar_data.json', grammarData);
            const exportedAt = Date.now();
            await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { grammarUrl, exportedAt }, { merge: true });
            if (!silent) setNotification({ type: 'success', message: 'Đồng bộ Ngữ pháp thành công!' });
            return { grammarUrl, exportedAt };
        } catch (error) {
            console.error('Error syncing grammar:', error);
            if (!silent) setNotification({ type: 'error', message: 'Lỗi khi đồng bộ Ngữ pháp: ' + error.message });
            throw error;
        } finally {
            if (!silent) {
                setSyncingCache(prev => ({ ...prev, grammar: false }));
                setSyncProgress('');
            }
        }
    };

    const syncJlpt = async (silent = false) => {
        if (!silent) {
            setSyncingCache(prev => ({ ...prev, jlpt: true }));
            setSyncProgress('Đang tải dữ liệu Đề thi JLPT từ Firestore...');
        }
        try {
            const jlptData = await fetchAllJlptTestsData();
            if (!silent) setSyncProgress('Đang tải file Đề thi JLPT lên Cloud Storage CDN...');
            const jlptUrl = await uploadCacheFile('jlpt_data.json', jlptData);
            const exportedAt = Date.now();
            await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { jlptUrl, exportedAt }, { merge: true });
            if (!silent) setNotification({ type: 'success', message: 'Đồng bộ Đề thi JLPT thành công!' });
            return { jlptUrl, exportedAt };
        } catch (error) {
            console.error('Error syncing JLPT:', error);
            if (!silent) setNotification({ type: 'error', message: 'Lỗi khi đồng bộ Đề thi JLPT: ' + error.message });
            throw error;
        } finally {
            if (!silent) {
                setSyncingCache(prev => ({ ...prev, jlpt: false }));
                setSyncProgress('');
            }
        }
    };

    const syncAllCache = async () => {
        setSyncingCache(prev => ({ ...prev, all: true }));
        try {
            setSyncProgress('1. Đồng bộ Kanji & Từ vựng...');
            await syncKanjiAndVocab(true, true);
            setSyncProgress('2. Đồng bộ Kho sách...');
            await syncBooks(true);
            setSyncProgress('3. Đồng bộ Ngữ pháp...');
            await syncGrammar(true);
            setSyncProgress('4. Đồng bộ Đề thi JLPT...');
            await syncJlpt(true);
            setNotification({ type: 'success', message: 'Đồng bộ tất cả dữ liệu tĩnh thành công!' });
        } catch (error) {
            setNotification({ type: 'error', message: 'Lỗi khi đồng bộ: ' + error.message });
        } finally {
            setSyncingCache(prev => ({ ...prev, all: false }));
            setSyncProgress('');
        }
    };

    const handleSendNotification = async () => {
        if (!newNotificationText.title.trim() || !newNotificationText.message.trim()) {
            setNotificationError('Vui lòng điền đầy đủ tiêu đề và nội dung');
            return;
        }
        setSendingNotification(true);
        setNotificationError('');
        try {
            const ok = await sendGlobalNotification(
                newNotificationText.title, newNotificationText.message, currentUserId, notificationType, newNotificationText.link
            );
            if (ok) {
                setNewNotificationText({ title: '', message: '', link: '' });
                setNotificationType('normal');
                setNotification({ type: 'success', message: 'Đã gửi thông báo đến toàn bộ người dùng' });
            } else {
                setNotificationError('Lỗi khi gửi thông báo. Vui lòng kiểm tra lại kết nối.');
            }
        } catch (e) {
            console.error('Error sending notification:', e);
            setNotificationError('Lỗi khi gửi thông báo: ' + (e.message || e));
        } finally {
            setSendingNotification(false);
        }
    };

    const handleDeleteNotification = async (notifId) => {
        const ok = await deleteGlobalNotification(notifId);
        if (ok) setNotification({ type: 'success', message: 'Đã xóa thông báo' });
        else setNotification({ type: 'error', message: 'Lỗi khi xóa thông báo' });
    };

    if (isLoading) {
        return <LoadingIndicator text="Đang tải danh sách người dùng..." />;
    }

    const sections = [
        { id: 'users', label: 'Người dùng', icon: Users },
        { id: 'support', label: 'Hỗ trợ trực tuyến', icon: MessageSquare },
        { id: 'vocabulary', label: 'Kho từ vựng', icon: BookOpen },
        { id: 'ai', label: 'AI', icon: Bot },
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
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                            activeSection === sec.id
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                    >
                        <sec.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{sec.label}</span>
                    </button>
                ))}
            </div>

            {/* Sub-sections */}
            {activeSection === 'users' && (
                <AdminUsersSection
                    stats={stats} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    roleFilter={roleFilter} setRoleFilter={setRoleFilter} planFilter={planFilter} setPlanFilter={setPlanFilter}
                    sortBy={sortBy} sortOrder={sortOrder} setSortBy={setSortBy} setSortOrder={setSortOrder}
                    filteredUsers={filteredUsers} selectedUser={selectedUser} handleSelectUser={handleSelectUser}
                    currentUserId={currentUserId} adminConfig={adminConfig} getUserActivePlan={getUserActivePlan}
                    setNotification={setNotification} loadingProfile={loadingProfile} selectedUserProfile={selectedUserProfile}
                    selectedUserPackageState={selectedUserPackageState} setSelectedUserPackageState={setSelectedUserPackageState}
                    handleSaveUserPackage={handleSaveUserPackage} updatingUserPackage={updatingUserPackage} kanjiStats={kanjiStats}
                    getUserPlans={getUserPlans} formatVND={formatVND} handleToggleModerator={handleToggleModerator}
                    savingConfig={savingConfig} setDeleteType={setDeleteType} setConfirmDelete={setConfirmDelete}
                    handleSyncUserByUidOrEmail={handleSyncUserByUidOrEmail}
                    handleSyncAllUsersFromFirestore={handleSyncAllUsersFromFirestore}
                    isSyncingAllUsers={isSyncingAllUsers}
                />
            )}

            {activeSection === 'support' && (
                <AdminSupportChatSection users={users} currentUserId={currentUserId} />
            )}

            {activeSection === 'ai' && (
                <AdminAiSection adminConfig={adminConfig} handleChangeFeatureModel={handleChangeFeatureModel} />
            )}

            {activeSection === 'moderators' && (
                <AdminModeratorsSection
                    adminConfig={adminConfig} users={users} currentUserId={currentUserId}
                    handleToggleModerator={handleToggleModerator} savingConfig={savingConfig}
                />
            )}

            {activeSection === 'vouchers' && (
                <AdminVouchersSection
                    vouchers={vouchers} currentUserId={currentUserId} setNotification={setNotification}
                    formatVND={formatVND} savingConfig={savingConfig} setSavingConfig={setSavingConfig}
                />
            )}

            {activeSection === 'revenue' && (
                <AdminRevenueSection
                    apiBalances={apiBalances} fetchApiBalances={fetchApiBalances} selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth} creditRequests={creditRequests} expenses={expenses}
                    stats={stats} users={users} formatVND={formatVND} currentUserId={currentUserId}
                    setNotification={setNotification} savingConfig={savingConfig} setSavingConfig={setSavingConfig}
                />
            )}

            {activeSection === 'vocabulary' && (
                <AdminVocabularySection
                    jaCount={jaCount} enCount={enCount} dictLangTab={dictLangTab} setDictLangTab={setDictLangTab}
                    dictSearchQuery={dictSearchQuery} setDictSearchQuery={setDictSearchQuery} dictLevelFilter={dictLevelFilter}
                    setDictLevelFilter={setDictLevelFilter} dictPosFilter={dictPosFilter} setDictPosFilter={setDictPosFilter}
                    dictErrorReportedFilter={dictErrorReportedFilter} setDictErrorReportedFilter={setDictErrorReportedFilter}
                    dictKanjiFilter={dictKanjiFilter} setDictKanjiFilter={setDictKanjiFilter} filteredDictResults={filteredDictResults}
                    isBulkRecreating={isBulkRecreating} bulkProgress={bulkProgress} handleCancelBulkRecreate={handleCancelBulkRecreate}
                    handleBulkAiRecreate={handleBulkAiRecreate} isLoadingDict={isLoadingDict} visibleLimit={visibleLimit}
                    setVisibleLimit={setVisibleLimit} playAudio={playAudio} recreatingVocabId={recreatingVocabId}
                    handleAiRecreateVocabulary={handleAiRecreateVocabulary} handleOpenEditModal={handleOpenEditModal}
                    setDeletingDictItem={setDeletingDictItem} handleClearSharedVocabCollection={handleClearSharedVocabCollection}
                    isClearingDict={isClearingDict}
                />
            )}

            {activeSection === 'system' && (
                <AdminSystemSection
                    adminConfig={adminConfig} updateAdminConfig={updateAdminConfig} currentUserId={currentUserId}
                    setNotification={setNotification} savingConfig={savingConfig} setSavingConfig={setSavingConfig}
                    maintenanceMsg={maintenanceMsg} setMaintenanceMsg={setMaintenanceMsg} newNotificationText={newNotificationText}
                    setNewNotificationText={setNewNotificationText} notificationType={notificationType} setNotificationType={setNotificationType}
                    notificationError={notificationError} sendingNotification={sendingNotification} handleSendNotification={handleSendNotification}
                    cacheConfig={cacheConfig} syncProgress={syncProgress} syncingCache={syncingCache} syncKanjiAndVocab={syncKanjiAndVocab}
                    syncBooks={syncBooks} syncGrammar={syncGrammar} syncJlpt={syncJlpt} syncAllCache={syncAllCache}
                    globalNotifications={globalNotifications} handleDeleteNotification={handleDeleteNotification} showConfirm={showConfirm}
                />
            )}

            {/* Extracted Modals */}
            <AdminDeleteUserModal
                confirmDelete={confirmDelete} deleteType={deleteType} deleting={deleting}
                setConfirmDelete={setConfirmDelete} setDeleteType={setDeleteType} handleDelete={handleDelete}
            />

            <AdminEditDictModal
                editingDictItem={editingDictItem} setEditingDictItem={setEditingDictItem}
                handleSaveDictItem={handleSaveDictItem} originalAudioBase64={originalAudioBase64} setNotification={setNotification}
            />

            <AdminDeleteDictModal
                deletingDictItem={deletingDictItem} setDeletingDictItem={setDeletingDictItem}
                handleDeleteDictItem={handleDeleteDictItem}
            />

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-[10005] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default AdminScreen;
