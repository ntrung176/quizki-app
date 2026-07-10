import React, { useState, useEffect, useRef } from 'react';
import { db, appId } from '../../config/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, setDoc, doc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { MessageSquare, X, Send, Image as ImageIcon, Loader2, ChevronLeft, CornerUpLeft, Smile } from 'lucide-react';

// Image compression utility
const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const AdminFloatingSupportChatbox = ({ currentUserId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [threads, setThreads] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [sending, setSending] = useState(false);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [replyingTo, setReplyingTo] = useState(null);
    const [activeReactionPicker, setActiveReactionPicker] = useState(null);
    const [activePreviewImage, setActivePreviewImage] = useState(null);

    const formatLastActive = (lastActive) => {
        if (!lastActive) return 'Ngoại tuyến';
        const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
        const diffMs = Date.now() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes < 1) return 'Vừa hoạt động';
        if (diffMinutes < 60) return `Hoạt động ${diffMinutes} phút trước`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        return `Hoạt động ${diffDays} ngày trước`;
    };

    const handleReact = async (msgId, emoji) => {
        try {
            if (!selectedUserId) return;
            const chatPath = `artifacts/${appId}/forum/support_chat_${selectedUserId}/comments`;
            const msgRef = doc(db, chatPath, msgId);
            const msg = messages.find(m => m.id === msgId);
            const currentReactions = msg?.reactions || {};
            const newReactions = { ...currentReactions };
            
            const reactorId = currentUserId || 'admin';
            if (newReactions[reactorId] === emoji) {
                delete newReactions[reactorId];
            } else {
                newReactions[reactorId] = emoji;
            }
            
            await updateDoc(msgRef, { reactions: newReactions });
        } catch (e) {
            console.error("Error setting reaction:", e);
        }
    };

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-resize textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [replyText]);

    // Scroll to bottom on open or user select
    useEffect(() => {
        if (isOpen && selectedUserId) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isOpen, selectedUserId]);

    // Real-time threads subscription
    useEffect(() => {
        if (!db || !isOpen) return;

        setLoadingThreads(true);
        const q = query(
            collection(db, `artifacts/${appId}/forum`),
            where('isSupportChat', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const threadList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    userId: data.userId,
                    displayName: data.senderName || 'Người dùng ẩn danh',
                    email: data.email || '',
                    lastMessage: {
                        text: data.text || '',
                        createdAt: data.updatedAt || null,
                        isAdmin: data.isAdminReply || false
                    },
                    hasUnreadAdmin: !!data.hasUnreadAdmin,
                    hasUnreadUser: !!data.hasUnreadUser,
                    userLastActive: data.userLastActive || null
                };
            });

            // Sort threads by last activity descending
            threadList.sort((a, b) => {
                const aTime = a.lastMessage.createdAt?.toDate ? a.lastMessage.createdAt.toDate().getTime() : (a.lastMessage.createdAt || 0);
                const bTime = b.lastMessage.createdAt?.toDate ? b.lastMessage.createdAt.toDate().getTime() : (b.lastMessage.createdAt || 0);
                return bTime - aTime;
            });

            setThreads(threadList);
            setLoadingThreads(false);
        }, (error) => {
            console.error("Error loading threads in admin floating box:", error);
            setLoadingThreads(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    // Unread count for floating badge (loaded in background if logged in)
    useEffect(() => {
        if (!db) return;
        const q = query(
            collection(db, `artifacts/${appId}/forum`),
            where('isSupportChat', '==', true)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const threadList = snapshot.docs.map(doc => doc.data());
            const unreads = threadList.filter(t => t.hasUnreadAdmin).length;
            // Document title notifier or local badge update
        });
        return () => unsubscribe();
    }, []);

    // Real-time messages subscription for selected user
    useEffect(() => {
        if (!selectedUserId || !db || !isOpen) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);
        const q = collection(db, `artifacts/${appId}/forum/support_chat_${selectedUserId}/comments`);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort messages chronological
            list.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return aTime - bTime;
            });

            setMessages(prev => {
                const isFirstLoad = prev.length === 0;
                const hasNewMessages = list.length > prev.length;
                if (isFirstLoad) {
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                    }, 50);
                } else if (hasNewMessages) {
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                }
                return list;
            });
            setLoadingMessages(false);
        }, (error) => {
            console.error("Error loading messages for user:", selectedUserId, error);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [selectedUserId, isOpen]);

    // Mark messages as read when admin enters chat
    useEffect(() => {
        if (isOpen && selectedUserId && db) {
            const markAsRead = async () => {
                try {
                    const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${selectedUserId}`);
                    await setDoc(statusDocRef, {
                        hasUnreadAdmin: false
                    }, { merge: true });
                } catch (e) {
                    console.error("Error marking thread as read:", e);
                }
            };
            markAsRead();
        }
    }, [isOpen, selectedUserId]);

    // Heartbeat to update admin presence when chat is open
    useEffect(() => {
        if (!isOpen || !selectedUserId || !db) return;
        const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${selectedUserId}`);
        const updateAdminPresence = async () => {
            try {
                const { setDoc, serverTimestamp } = await import('firebase/firestore');
                await setDoc(statusDocRef, {
                    adminLastActive: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                // silent
            }
        };

        updateAdminPresence();
        const interval = setInterval(updateAdminPresence, 45000); // 45s heartbeat
        return () => clearInterval(interval);
    }, [isOpen, selectedUserId]);

    // Handle image select
    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Hình ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 2 MB.');
            return;
        }

        setLoadingMessages(true);
        try {
            const compressed = await compressImage(file);
            setSelectedImage(compressed);
        } catch (error) {
            console.error("Error processing image:", error);
            alert("Lỗi khi xử lý hình ảnh.");
        } finally {
            setLoadingMessages(false);
        }
    };

    // Handle paste event (Ctrl+V)
    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (!file) continue;

                if (file.size > 2 * 1024 * 1024) {
                    alert('Hình ảnh dán quá lớn! Vui lòng chọn ảnh nhỏ hơn 2 MB.');
                    return;
                }

                setLoadingMessages(true);
                try {
                    const compressed = await compressImage(file);
                    setSelectedImage(compressed);
                } catch (error) {
                    console.error("Error processing pasted image:", error);
                } finally {
                    setLoadingMessages(false);
                }
                e.preventDefault();
                break;
            }
        }
    };

    // Send Reply
    const handleSendReply = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if ((!replyText.trim() && !selectedImage) || sending || !selectedUserId) return;

        setSending(true);
        const textToSend = replyText.trim();
        const imageToSend = selectedImage;

        const replyToPayload = replyingTo ? {
            senderName: replyingTo.senderName,
            text: replyingTo.text || '',
            imageUrl: replyingTo.imageUrl || null
        } : null;

        if (textareaRef.current) {
            textareaRef.current.style.height = '36px';
        }
        setReplyText('');
        setSelectedImage(null);
        setReplyingTo(null);

        try {
            // Add comment/message to the subcollection
            await addDoc(collection(db, `artifacts/${appId}/forum/support_chat_${selectedUserId}/comments`), {
                userId: selectedUserId,
                senderId: currentUserId,
                senderName: 'Ban quản trị QuizKi',
                text: textToSend,
                imageUrl: imageToSend || null,
                isAdmin: true,
                isSupportChat: true,
                createdAt: serverTimestamp(),
                replyTo: replyToPayload
            });

            // Update status doc
            const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${selectedUserId}`);
            await setDoc(statusDocRef, {
                isSupportChat: true,
                userId: selectedUserId,
                text: textToSend,
                isAdminReply: true,
                hasUnreadUser: true,
                hasUnreadAdmin: false,
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error sending admin reply floating:", error);
            setReplyText(textToSend);
            setSelectedImage(imageToSend);
            alert("Lỗi khi gửi phản hồi.");
        } finally {
            setSending(false);
        }
    };

    const unreadCount = threads.filter(t => t.hasUnreadAdmin).length;
    const selectedThread = threads.find(t => t.userId === selectedUserId);

    return (
        <>
            {/* Floating Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`hidden lg:flex fixed bottom-6 right-6 z-55 w-14 h-14 rounded-full items-center justify-center text-white shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer bg-[#2E5B70] shadow-[#2E5B70]/30 ${isOpen ? 'opacity-100' : 'opacity-50 hover:opacity-100 focus:opacity-100 active:opacity-100'}`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 animate-fade-in" />
                ) : (
                    <div className="relative">
                        <MessageSquare className="w-6 h-6 animate-fade-in" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2.5 -right-2.5 min-w-5 h-5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black text-white px-1.5 animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                )}
            </button>

            {/* Chatbox Container */}
            {isOpen && (() => {
                const isUserOnline = (lastActive) => {
                    if (!lastActive) return false;
                    const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
                    return (Date.now() - date.getTime()) < 3 * 60 * 1000;
                };
                return (
                    <div className="fixed bottom-24 right-6 z-55 w-[340px] sm:w-[390px] h-[500px] sm:h-[540px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-fade-in font-sans">
                        
                        {/* Header */}
                        <div className="bg-[#2E5B70] p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {selectedUserId ? (
                                    <button
                                        onClick={() => setSelectedUserId(null)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-white/90 hover:text-white transition-colors cursor-pointer mr-1"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                        <MessageSquare className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-bold leading-none truncate flex items-center gap-1.5">
                                        {selectedThread ? selectedThread.displayName : 'Admin Hỗ trợ'}
                                        {selectedThread && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline(selectedThread.userLastActive) ? 'bg-emerald-450 animate-pulse' : 'bg-slate-400'}`} />
                                        )}
                                    </h3>
                                    <p className="text-[10px] text-white/80 font-medium mt-1 truncate">
                                        {selectedThread ? `${isUserOnline(selectedThread.userLastActive) ? 'Trực tuyến' : formatLastActive(selectedThread.userLastActive)} | Email: ${selectedThread.email || 'N/A'}` : `Yêu cầu cần xử lý (${threads.length})`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                    {/* Content Area */}
                    {!selectedUserId ? (
                        /* Thread List View */
                        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 divide-y divide-gray-100 dark:divide-slate-850 support-chat-scrollbar">
                            {loadingThreads ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-[#2E5B70] animate-spin" />
                                </div>
                            ) : threads.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-550">Chưa có tin nhắn hỗ trợ</p>
                                    <p className="text-[11px] text-slate-400 max-w-[220px]">
                                        Tất cả yêu cầu và báo lỗi từ học sinh sẽ xuất hiện tại đây khi họ bắt đầu gửi tin nhắn.
                                    </p>
                                </div>
                            ) : (
                                threads.map(thread => {
                                    const needsReply = thread.hasUnreadAdmin;
                                    const timeStr = thread.lastMessage.createdAt?.toDate
                                        ? thread.lastMessage.createdAt.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                        : '';
                                    const isOnlineThread = isUserOnline(thread.userLastActive);
                                    return (
                                        <div
                                            key={thread.userId}
                                            onClick={() => setSelectedUserId(thread.userId)}
                                            className="p-3.5 hover:bg-white dark:hover:bg-slate-900 cursor-pointer transition-all flex items-start gap-3 relative"
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="w-9 h-9 rounded-xl bg-[#2E5B70]/10 dark:bg-[#2E5B70]/20 flex items-center justify-center font-bold text-[#2E5B70] dark:text-[#3B728C] text-sm">
                                                    {(thread.displayName || '?')[0].toUpperCase()}
                                                </div>
                                                {isOnlineThread && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" title="Online" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate pr-2">
                                                        {thread.displayName}
                                                    </p>
                                                    {timeStr && (
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                            {timeStr}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs truncate ${needsReply ? 'text-gray-900 dark:text-gray-100 font-black' : 'text-slate-400 dark:text-slate-550'}`}>
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
                    ) : (
                        /* Message Stream View */
                        <>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50 dark:bg-slate-950 space-y-3 support-chat-scrollbar">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-[#2E5B70] animate-spin" />
                                    </div>
                                ) : (() => {
                                    const lastAdminMsgIndex = [...messages].reverse().findIndex(msg => msg.isAdmin);
                                    const actualLastAdminMsgIndex = lastAdminMsgIndex !== -1 ? messages.length - 1 - lastAdminMsgIndex : -1;
                                    return messages.map((msg, index) => {
                                        const isSelf = msg.isAdmin;
                                        const isLastAdminMsg = index === actualLastAdminMsgIndex;
                                        const dateObj = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : null);
                                        const formattedTime = dateObj ? dateObj.toLocaleString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        }) : '';
                                        return (
                                            <div
                                                key={msg.id || index}
                                                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} mb-2`}
                                            >
                                                <span className="text-[9px] text-slate-400 dark:text-slate-550 font-bold mb-0.5 px-1">
                                                    {isSelf ? 'Ban quản trị' : selectedThread?.displayName}
                                                    {formattedTime && <span className="font-normal text-slate-400/85 dark:text-slate-500/85 ml-1.5">{formattedTime}</span>}
                                                </span>
                                                <div className="flex items-center gap-2 max-w-[85%] group relative">
                                                    {isSelf && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 relative">
                                                            {activeReactionPicker === msg.id && (
                                                                <div className="absolute bottom-full mb-1 left-0 flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 shadow-xl rounded-full px-2 py-1 z-30 flex-row">
                                                                    {['👍', '❤️', '😂', '😮', '😢', '😠'].map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleReact(msg.id, emoji);
                                                                                setActiveReactionPicker(null);
                                                                            }}
                                                                            className="text-base hover:scale-130 transition-transform duration-100 p-0.5 cursor-pointer"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveReactionPicker(activeReactionPicker === msg.id ? null : msg.id)}
                                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                                title="Bày tỏ cảm xúc"
                                                            >
                                                                <Smile className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReplyingTo({ id: msg.id, senderName: msg.isAdmin ? 'Ban quản trị' : (selectedThread?.displayName || 'Người dùng'), text: msg.text, imageUrl: msg.imageUrl })}
                                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                                title="Trả lời"
                                                            >
                                                                <CornerUpLeft className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm relative ${
                                                            isSelf
                                                                ? 'bg-[#2E5B70] text-white rounded-tr-none'
                                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-150/40 dark:border-slate-700/50'
                                                        }`}
                                                    >
                                                        {msg.replyTo && (
                                                            <div className="mb-2 text-[10px] text-slate-400 dark:text-slate-450 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1.5 max-w-[220px] truncate border-l-2 border-[#2E5B70]/60">
                                                                <span className="font-bold text-[#2E5B70] dark:text-[#3B728C] mr-1">
                                                                    {msg.replyTo.senderName}:
                                                                </span>
                                                                {msg.replyTo.text || '[Hình ảnh]'}
                                                            </div>
                                                        )}

                                                        {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                                                        {msg.imageUrl && (
                                                            <div className="mt-2 rounded-lg overflow-hidden max-w-[200px] border border-black/5 dark:border-white/5">
                                                                <img
                                                                    src={msg.imageUrl}
                                                                    alt="Đính kèm"
                                                                    className="w-full h-auto object-cover max-h-40 cursor-zoom-in hover:opacity-95 transition-opacity"
                                                                    onClick={() => setActivePreviewImage(msg.imageUrl)}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Reactions Display */}
                                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                            <div className={`absolute -bottom-2.5 ${isSelf ? 'right-2' : 'left-2'} bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 shadow-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[9px] z-10 select-none`}>
                                                                {Array.from(new Set(Object.values(msg.reactions))).map((emoji, idx) => (
                                                                    <span key={idx}>{emoji}</span>
                                                                ))}
                                                                {Object.keys(msg.reactions).length > 1 && (
                                                                    <span className="text-slate-455 dark:text-slate-400 font-bold ml-0.5">{Object.keys(msg.reactions).length}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!isSelf && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => setReplyingTo({ id: msg.id, senderName: msg.isAdmin ? 'Ban quản trị' : (selectedThread?.displayName || 'Người dùng'), text: msg.text, imageUrl: msg.imageUrl })}
                                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-855 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                                title="Trả lời"
                                                            >
                                                                <CornerUpLeft className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveReactionPicker(activeReactionPicker === msg.id ? null : msg.id)}
                                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-855 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                                title="Bày tỏ cảm xúc"
                                                            >
                                                                <Smile className="w-3.5 h-3.5" />
                                                            </button>
                                                            {activeReactionPicker === msg.id && (
                                                                <div className="absolute bottom-full mb-1 right-0 flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 shadow-xl rounded-full px-2 py-1 z-30 flex-row">
                                                                    {['👍', '❤️', '😂', '😮', '😢', '😠'].map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleReact(msg.id, emoji);
                                                                                setActiveReactionPicker(null);
                                                                            }}
                                                                            className="text-base hover:scale-130 transition-transform duration-100 p-0.5 cursor-pointer"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelf && isLastAdminMsg && (
                                                    <span className="text-[9px] text-slate-400 dark:text-slate-550 mt-1 mr-1">
                                                        {selectedThread?.hasUnreadUser ? 'Đã gửi' : 'Đã đọc'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Image Attachment Preview */}
                            {selectedImage && (
                                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <img src={selectedImage} className="w-12 h-12 object-cover rounded-md border border-gray-200" alt="Preview" />
                                        <span className="text-[10px] text-slate-400 font-semibold">Đã chọn 1 ảnh</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedImage(null)}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 rounded-full cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Reply Quoted Preview */}
                            {replyingTo && (
                                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-t border-gray-150 dark:border-slate-700 flex items-center justify-between text-xs animate-slide-up">
                                    <div className="flex-1 min-w-0 border-l-2 border-[#2E5B70] pl-2">
                                        <p className="font-bold text-[#2E5B70] dark:text-[#3B728C] leading-none mb-1 text-[10px]">
                                            Đang trả lời {replyingTo.senderName}
                                        </p>
                                        <p className="text-[11px] text-slate-550 dark:text-slate-400 truncate">
                                            {replyingTo.text || '[Hình ảnh]'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-full transition-colors cursor-pointer ml-2"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Input Panel */}
                            <form onSubmit={handleSendReply} className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
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

                                <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply(e);
                                        }
                                    }}
                                    onPaste={handlePaste}
                                    className="flex-1 py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#2E5B70] text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none max-h-[120px] min-h-[36px] leading-relaxed scrollbar-hide"
                                    placeholder="Nhập nội dung tin nhắn..."
                                />

                                <button
                                    type="submit"
                                    disabled={(!replyText.trim() && !selectedImage) || sending}
                                    className="p-2.5 rounded-xl bg-[#2E5B70] hover:bg-[#254A5C] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )
        })()}

        {/* Fullscreen Image Preview Modal */}
        {activePreviewImage && (
            <div
                className="fixed inset-0 bg-black/85 z-99 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
                onClick={() => setActivePreviewImage(null)}
            >
                <button
                    onClick={() => setActivePreviewImage(null)}
                    className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/45 hover:bg-black/60 rounded-full transition-all cursor-pointer"
                >
                    <X className="w-6 h-6" />
                </button>
                <img
                    src={activePreviewImage}
                    alt="Zoomed"
                    className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-300 ease-out"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )}
        </>
    );
};

export default AdminFloatingSupportChatbox;
