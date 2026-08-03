import React from 'react';
import { query, collection, where, getDocs, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { MessageSquare, Loader2, ChevronLeft, Smile, CornerUpLeft, Image as ImageIcon, Send, X as XIcon } from 'lucide-react';

const AdminSupportChatSection = ({ users, currentUserId }) => {
    const [threads, setThreads] = React.useState([]);
    const [selectedUserId, setSelectedUserId] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [replyText, setReplyText] = React.useState('');
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [sending, setSending] = React.useState(false);
    const [loadingThreads, setLoadingThreads] = React.useState(true);
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    const [activePreviewImage, setActivePreviewImage] = React.useState(null);
    const [replyingTo, setReplyingTo] = React.useState(null);
    const [activeReactionPicker, setActiveReactionPicker] = React.useState(null);

    const isUserOnline = React.useCallback((userId) => {
        const u = users.find(user => user.id === userId);
        if (!u || !u.lastUpdated) return false;
        const date = u.lastUpdated.toDate ? u.lastUpdated.toDate() : new Date(u.lastUpdated);
        return (Date.now() - date.getTime()) < 3 * 60 * 1000;
    }, [users]);

    const formatLastActive = React.useCallback((userId) => {
        const u = users.find(user => user.id === userId);
        if (!u || !u.lastUpdated) return 'Ngoại tuyến';
        const date = u.lastUpdated.toDate ? u.lastUpdated.toDate() : new Date(u.lastUpdated);
        const diffMs = Date.now() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes < 1) return 'Vừa hoạt động';
        if (diffMinutes < 60) return `Hoạt động ${diffMinutes} phút trước`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        return `Hoạt động ${diffDays} ngày trước`;
    }, [users]);

    const handleReact = async (msgId, emoji) => {
        try {
            if (!selectedUserId) return;
            const { doc, updateDoc } = await import('firebase/firestore');
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

    const messagesEndRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const textareaRef = React.useRef(null);

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [replyText]);

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
                    hasUnreadAdmin: data.hasUnreadAdmin || false,
                    hasUnreadUser: data.hasUnreadUser || false,
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

            setMessages(prev => {
                const isFirstLoad = showLoader || prev.length === 0;
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
        } catch (error) {
            console.error("Error fetching chat messages for user:", selectedUserId, error);
        } finally {
            if (showLoader) setLoadingMessages(false);
        }
    }, [selectedUserId]);

    // Load messages of selected thread and mark as read
    React.useEffect(() => {
        fetchMessages(true);

        if (selectedUserId && db) {
            const markAsRead = async () => {
                try {
                    const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${selectedUserId}`);
                    await setDoc(statusDocRef, {
                        hasUnreadAdmin: false
                    }, { merge: true });
                    // Instantly update thread list locally to clear badge
                    setThreads(prev => prev.map(t => t.userId === selectedUserId ? { ...t, hasUnreadAdmin: false } : t));
                } catch (e) {
                    console.error("Error marking thread as read:", e);
                }
            };
            markAsRead();
        }

        const interval = setInterval(() => {
            fetchMessages(false);
        }, 4000);
        return () => clearInterval(interval);
    }, [fetchMessages, selectedUserId]);

    // Heartbeat to update admin presence when chat is open in admin dashboard page
    React.useEffect(() => {
        if (!selectedUserId || !db) return;
        const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${selectedUserId}`);
        const updateAdminPresence = async () => {
            try {
                await setDoc(statusDocRef, {
                    adminLastActive: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                // silent
            }
        };

        updateAdminPresence();
        const interval = setInterval(updateAdminPresence, 45000);
        return () => clearInterval(interval);
    }, [selectedUserId]);

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

    // Handle pasting screenshots from clipboard
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (!file) continue;

                if (file.size > 1.2 * 1024 * 1024) {
                    alert('Hình ảnh dán quá lớn! Vui lòng chọn hoặc chụp ảnh nhỏ hơn 1.2 MB.');
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedImage(reader.result);
                };
                reader.readAsDataURL(file);
                e.preventDefault();
                break;
            }
        }
    };

    // Send reply
    const handleSendReply = async (e) => {
        e.preventDefault();
        if ((!replyText.trim() && !selectedImage) || sending || !selectedUserId) return;

        setSending(true);
        const textToSend = replyText.trim();
        const imageToSend = selectedImage;

        const replyToPayload = replyingTo ? {
            senderName: replyingTo.senderName,
            text: replyingTo.text || '',
            imageUrl: replyingTo.imageUrl || null
        } : null;

        setReplyText('');
        setSelectedImage(null);
        setReplyingTo(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = '36px';
        }

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
                createdAt: serverTimestamp(),
                replyTo: replyToPayload
            });

            // 2. Update status doc
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-240px)] md:h-[calc(100vh-200px)] min-h-[350px] max-h-[700px] shadow-sm">
            {/* Thread List */}
            <div className={`border-r border-gray-100 dark:border-gray-700 flex flex-col h-full min-h-0 bg-slate-50/50 dark:bg-slate-900/30 font-sans ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-xs">
                        <MessageSquare className="w-5 h-5 text-[#2E5B70]" />
                        Hội thoại hỗ trợ ({threads.length})
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-750 support-chat-scrollbar">
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
                            const needsReply = thread.hasUnreadAdmin;
                            const isOnline = isUserOnline(thread.userId);
                            return (
                                <div
                                    key={thread.userId}
                                    onClick={() => setSelectedUserId(thread.userId)}
                                    className={`p-4 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-all flex items-start gap-3 relative ${isSelected ? 'bg-white dark:bg-gray-800 border-l-4 border-[#2E5B70]' : ''
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-[#2E5B70] dark:text-[#3B728C] border border-slate-200 dark:border-slate-700">
                                            {(thread.displayName || '?')[0].toUpperCase()}
                                        </div>
                                        {isOnline && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800" title="Online" />
                                        )}
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
            <div className={`md:col-span-2 flex flex-col h-full min-h-0 bg-white dark:bg-gray-800 font-sans ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
                {selectedThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-105 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedUserId(null)}
                                    className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer text-gray-500"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-gray-800 dark:text-white text-xs leading-none">
                                            {selectedThread.displayName}
                                        </h4>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline(selectedThread.userId) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                    </div>
                                    <p className="text-[10px] text-gray-440 dark:text-gray-500 font-mono mt-1.5">
                                        {isUserOnline(selectedThread.userId) ? 'Trực tuyến' : formatLastActive(selectedThread.userId)} | Email: {selectedThread.email || 'N/A'} | ID: {selectedThread.userId}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Message Stream */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50 dark:bg-slate-950 space-y-3 support-chat-scrollbar">
                            {loadingMessages ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#2E5B70]" />
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
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mb-0.5 px-1">
                                                {isSelf ? 'Ban quản trị' : selectedThread.displayName}
                                                {formattedTime && <span className="font-normal text-slate-400/80 dark:text-slate-550/80 ml-1.5">{formattedTime}</span>}
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
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-855 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                            title="Bày tỏ cảm xúc"
                                                        >
                                                            <Smile className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setReplyingTo({ id: msg.id, senderName: msg.isAdmin ? 'Ban quản trị' : (selectedThread.displayName || 'Người dùng'), text: msg.text, imageUrl: msg.imageUrl })}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-855 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                                                        <div className="mt-2 rounded-lg overflow-hidden border border-black/5 dark:border-white/5 max-w-[260px]">
                                                            <img
                                                                src={msg.imageUrl}
                                                                alt="Đính kèm"
                                                                className="w-full h-auto object-cover max-h-56 cursor-zoom-in hover:opacity-90 transition-opacity"
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
                                                            onClick={() => setReplyingTo({ id: msg.id, senderName: msg.isAdmin ? 'Ban quản trị' : (selectedThread.displayName || 'Người dùng'), text: msg.text, imageUrl: msg.imageUrl })}
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
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 mr-1">
                                                    {selectedThread?.hasUnreadUser ? 'Đã gửi' : 'Đã đọc'}
                                                </span>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
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

                        {/* Reply Quoted Preview */}
                        {replyingTo && (
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-gray-150 dark:border-slate-700 flex items-center justify-between text-xs animate-slide-up">
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
                                    <XIcon className="w-3.5 h-3.5" />
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
                                placeholder="Gõ câu trả lời của bạn hoặc dán ảnh (Ctrl+V)..."
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

            {/* Fullscreen Image Preview Modal */}
            {activePreviewImage && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
                    onClick={() => setActivePreviewImage(null)}
                >
                    <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={activePreviewImage}
                            alt="Xem ảnh đính kèm"
                            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain border border-white/10"
                        />
                        <button
                            onClick={() => setActivePreviewImage(null)}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/75 text-white p-2.5 rounded-full shadow-lg transition-all border border-white/10 cursor-pointer"
                            title="Đóng"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSupportChatSection;
