import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, X, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, doc, updateDoc, getDoc, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';

/**
 * BookVocabSyncChecker
 * 
 * Shows a notification when admin has edited vocab in books that the user has in their SRS.
 * User can accept (apply changes) or dismiss updates.
 * 
 * Props:
 * - userId: current user ID
 * - appId: Firebase app ID
 * - allCards: user's SRS vocab cards
 * - vocabCollectionPath: path to user's vocab collection in Firestore
 */
const BookVocabSyncChecker = ({ userId, appId, allCards = [], vocabCollectionPath }) => {
    const [pendingUpdates, setPendingUpdates] = useState([]);
    const [showDetails, setShowDetails] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    // Check for pending updates
    useEffect(() => {
        if (!userId || !appId || !vocabCollectionPath || allCards.length === 0) return;

        const checkUpdates = async () => {
            try {
                // Get user's last sync timestamp
                const syncDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'bookSync');
                const syncSnap = await getDoc(syncDocRef);
                const lastSyncAt = syncSnap.exists() ? (syncSnap.data().lastSyncAt?.toDate?.() || new Date(syncSnap.data().lastSyncAt || 0)) : new Date(0);

                // Get updates newer than last sync
                const updatesCol = collection(db, `artifacts/${appId}/bookVocabUpdates`);
                const updatesSnap = await getDocs(updatesCol);

                if (updatesSnap.empty) return;

                // Filter updates newer than last sync and matching user's vocab
                const userWordSet = new Set(
                    allCards.map(c => c.front.split('（')[0].split('(')[0].trim().toLowerCase())
                );

                const relevant = [];
                updatesSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    const updateDate = data.updatedAt?.toDate?.() || new Date(data.updatedAt || 0);

                    // Only show updates newer than last sync
                    if (updateDate <= lastSyncAt) return;

                    // Only show if user has this word in their SRS
                    const word = (data.word || '').toLowerCase();
                    if (!userWordSet.has(word)) return;

                    // Find the matching user card
                    const matchedCard = allCards.find(c =>
                        c.front.split('（')[0].split('(')[0].trim().toLowerCase() === word
                    );

                    relevant.push({
                        id: docSnap.id,
                        ...data,
                        matchedCardId: matchedCard?.id,
                        matchedCardFront: matchedCard?.front,
                        updatedAt: updateDate,
                    });
                });

                // Sort by date, newest first, and deduplicate by word (keep latest)
                relevant.sort((a, b) => b.updatedAt - a.updatedAt);
                const seenWords = new Set();
                const deduped = [];
                for (const up of relevant) {
                    const w = (up.word || '').toLowerCase();
                    if (!seenWords.has(w)) {
                        seenWords.add(w);
                        deduped.push(up);
                    }
                }

                setPendingUpdates(deduped);
            } catch (e) {
                console.error('Error checking book vocab updates:', e);
            }
        };

        checkUpdates();
    }, [userId, appId, allCards, vocabCollectionPath]);

    // Apply all updates
    const handleApplyAll = useCallback(async () => {
        if (!vocabCollectionPath || isApplying) return;
        setIsApplying(true);
        let applied = 0;

        try {
            for (const update of pendingUpdates) {
                if (!update.matchedCardId || !update.changes) continue;

                const cardDocRef = doc(db, vocabCollectionPath, update.matchedCardId);
                const updateData = {};

                // Map book fields to SRS card fields  
                for (const [field, value] of Object.entries(update.changes)) {
                    if (field === 'meaning') {
                        updateData.back = value;
                    } else if (field === 'back') {
                        updateData.back = value;
                    } else {
                        updateData[field] = value;
                    }
                }

                if (Object.keys(updateData).length > 0) {
                    await updateDoc(cardDocRef, updateData);
                    applied++;
                }
            }

            // Save sync timestamp
            const syncDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'bookSync');
            await setDoc(syncDocRef, { lastSyncAt: new Date() }, { merge: true });

            setAppliedCount(applied);
            setPendingUpdates([]);

            // Auto-dismiss after showing success
            setTimeout(() => setDismissed(true), 3000);
        } catch (e) {
            console.error('Error applying vocab updates:', e);
        } finally {
            setIsApplying(false);
        }
    }, [pendingUpdates, vocabCollectionPath, appId, userId, isApplying]);

    // Dismiss without applying
    const handleDismiss = useCallback(async () => {
        // Save sync timestamp so these updates won't show again
        try {
            const syncDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'bookSync');
            await setDoc(syncDocRef, { lastSyncAt: new Date() }, { merge: true });
        } catch (e) { /* ignore */ }
        setDismissed(true);
    }, [appId, userId]);

    // Apply single update
    const handleApplySingle = useCallback(async (update, index) => {
        if (!vocabCollectionPath || !update.matchedCardId) return;

        try {
            const cardDocRef = doc(db, vocabCollectionPath, update.matchedCardId);
            const updateData = {};

            for (const [field, value] of Object.entries(update.changes || {})) {
                if (field === 'meaning') {
                    updateData.back = value;
                } else if (field === 'back') {
                    updateData.back = value;
                } else {
                    updateData[field] = value;
                }
            }

            if (Object.keys(updateData).length > 0) {
                await updateDoc(cardDocRef, updateData);
            }

            // Remove from pending
            setPendingUpdates(prev => prev.filter((_, i) => i !== index));
        } catch (e) {
            console.error('Error applying single update:', e);
        }
    }, [vocabCollectionPath]);

    // Skip single update  
    const handleSkipSingle = useCallback((index) => {
        setPendingUpdates(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Don't render if no updates or dismissed
    if (dismissed || (pendingUpdates.length === 0 && appliedCount === 0)) return null;

    // Success state
    if (appliedCount > 0 && pendingUpdates.length === 0) {
        return (
            <div className="mx-auto max-w-2xl mb-4 animate-fadeIn">
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Đã đồng bộ {appliedCount} từ vựng từ sách vào kho của bạn!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl mb-4 animate-fadeIn">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0 animate-pulse">
                            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                                📚 Có {pendingUpdates.length} từ vựng được cập nhật từ sách
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                Admin đã chỉnh sửa từ vựng trong sách. Bạn muốn đồng bộ?
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleApplyAll}
                            disabled={isApplying}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            {isApplying ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            Chấp nhận tất cả
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            Bỏ qua
                        </button>
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="p-1.5 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-lg transition-colors"
                        >
                            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Details */}
                {showDetails && (
                    <div className="border-t border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-800/50">
                        {pendingUpdates.map((update, i) => (
                            <div key={update.id} className="px-4 py-3 flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{update.wordFull || update.word}</span>
                                        {update.bookName && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded">
                                                {update.bookName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 space-y-0.5">
                                        {Object.entries(update.changes || {}).map(([field, value]) => (
                                            <div key={field} className="flex items-center gap-1.5 text-xs">
                                                <span className="text-gray-400 dark:text-gray-500 font-medium w-16 shrink-0">{
                                                    field === 'meaning' || field === 'back' ? 'Nghĩa' :
                                                        field === 'synonym' ? 'Đ.nghĩa' :
                                                            field === 'example' ? 'Ví dụ' :
                                                                field === 'exampleMeaning' ? 'Nghĩa VD' :
                                                                    field === 'nuance' ? 'Sắc thái' :
                                                                        field === 'reading' ? 'Đọc' :
                                                                            field
                                                }:</span>
                                                <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                                                <span className="text-emerald-600 dark:text-emerald-400 truncate">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleApplySingle(update, i)}
                                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                        title="Chấp nhận"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleSkipSingle(i)}
                                        className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Bỏ qua"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookVocabSyncChecker;
