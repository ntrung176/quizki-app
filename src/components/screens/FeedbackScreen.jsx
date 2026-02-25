import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    MessageSquare, Send, ArrowLeft, Clock, CheckCircle, XCircle, Trash2
} from 'lucide-react';
import { ROUTES } from '../../router';
import { collection, addDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

// ==================== Status Badge ====================
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

// ==================== Feedback Screen ====================
const FeedbackScreen = ({ userId, profile, isAdmin }) => {
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackCategory, setFeedbackCategory] = useState('bug');
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);

    const feedbackPath = `artifacts/${appId}/public/data/feedbacks`;

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
        loadFeedbacks();
    }, [loadFeedbacks]);

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

    const handleUpdateFeedbackStatus = async (feedbackId, newStatus) => {
        if (!isAdmin) return;
        try {
            await updateDoc(doc(db, feedbackPath, feedbackId), { status: newStatus });
            loadFeedbacks();
        } catch (e) {
            console.error('Error updating feedback:', e);
        }
    };

    const handleDeleteFeedback = async (feedbackId) => {
        if (!isAdmin) return;
        try {
            await deleteDoc(doc(db, feedbackPath, feedbackId));
            loadFeedbacks();
        } catch (e) {
            console.error('Error deleting feedback:', e);
        }
    };

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
                        <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Phản hồi
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gửi báo lỗi hoặc đề xuất tính năng mới</p>
                </div>
            </div>

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
                    <p className={`text-sm font-medium text-center ${feedbackMsg.includes('Lỗi') ? 'text-red-500' : 'text-emerald-500'}`}>
                        {feedbackMsg}
                    </p>
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
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
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
    );
};

export default FeedbackScreen;
