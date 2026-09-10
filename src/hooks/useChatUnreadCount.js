import { useState, useEffect } from 'react';
import { db, appId } from '../config/firebase';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

/**
 * Custom hook to get real-time unread chat count for both Admin and regular users.
 * - Admin: Counts support threads with `hasUnreadAdmin === true`.
 * - User: Listens to user's `support_chat_${userId}` status doc and subcollection comments
 *         to determine the exact unread message count from Admin.
 * 
 * @param {string} userId - Current authenticated user ID
 * @param {boolean} isAdmin - Whether the current user is an admin
 * @returns {number} unreadCount
 */
export const useChatUnreadCount = (userId, isAdmin = false) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userId || !db) {
            setUnreadCount(0);
            return;
        }

        if (isAdmin) {
            // Admin: Listen to all support chat threads
            const q = query(
                collection(db, `artifacts/${appId}/forum`),
                where('isSupportChat', '==', true)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                let count = 0;
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data?.hasUnreadAdmin) {
                        count++;
                    }
                });
                setUnreadCount(count);
            }, (error) => {
                console.error('Error listening to admin unread chat count:', error);
            });

            return () => unsubscribe();
        } else {
            // Regular User: Listen to thread status and comments
            let hasUnread = false;
            let commentsList = [];

            const calculateUserUnread = (unreadFlag, comments) => {
                if (!unreadFlag) {
                    setUnreadCount(0);
                    return;
                }

                // If flagged as unread, count consecutive admin messages from the end
                if (comments && comments.length > 0) {
                    let count = 0;
                    for (let i = comments.length - 1; i >= 0; i--) {
                        if (comments[i].isAdmin) {
                            count++;
                        } else {
                            break;
                        }
                    }
                    setUnreadCount(count > 0 ? count : 1);
                } else {
                    setUnreadCount(1);
                }
            };

            const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${userId}`);
            const unsubscribeStatus = onSnapshot(statusDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    hasUnread = !!data?.hasUnreadUser;
                    calculateUserUnread(hasUnread, commentsList);
                } else {
                    hasUnread = false;
                    setUnreadCount(0);
                }
            }, (error) => {
                console.error('Error listening to user unread chat status:', error);
            });

            const commentsColRef = collection(db, `artifacts/${appId}/forum`, `support_chat_${userId}`, 'comments');
            const unsubscribeComments = onSnapshot(commentsColRef, (snapshot) => {
                const list = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

                list.sort((a, b) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                    return aTime - bTime;
                });

                commentsList = list;
                calculateUserUnread(hasUnread, commentsList);
            }, (error) => {
                console.error('Error listening to user chat comments:', error);
            });

            return () => {
                unsubscribeStatus();
                unsubscribeComments();
            };
        }
    }, [userId, isAdmin]);

    return unreadCount;
};

export default useChatUnreadCount;
