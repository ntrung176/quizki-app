import React, { useState, useEffect, useRef } from 'react';
import { db, appId } from '../../config/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, setDoc, doc } from 'firebase/firestore'
import { MessageSquare, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react'

// Hàm nén ảnh về định dạng jpeg chất lượng 0.7 và giới hạn kích thước tối đa 1200px
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

                // Tính toán kích thước mới duy trì tỷ lệ khung hình
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

                // Xuất ảnh sang định dạng JPEG chất lượng thấp hơn
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const FeedbackChatbox = ({ userId, profile, isAdmin }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // base64 string
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [hasNewMessage, setHasNewMessage] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-resize textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [inputText]);

    const chatPath = `artifacts/${appId}/forum/support_chat_${userId}/comments`;
    const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${userId}`);

    // Subscribe to chat messages
    useEffect(() => {
        if (!userId || !db || !isOpen) return;

        setLoading(true);
        const q = collection(db, chatPath);

        const unsubscribe = onSnapshot(q, (snapshot) => {
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
            setLoading(false);
        }, (error) => {
            console.error("Error loading chat messages:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, isOpen]);

    // Keep track of unread messages when chatbox is CLOSED
    useEffect(() => {
        if (!userId || !db || isOpen) return;

        const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${userId}`);
        const unsubscribe = onSnapshot(statusDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setHasNewMessage(!!data.hasUnreadUser);
            }
        }, (error) => {
            console.error("Error listening to unread status:", error);
        });

        return () => unsubscribe();
    }, [userId, isOpen]);

    // Mark as read when chatbox is opened
    useEffect(() => {
        if (isOpen && userId && db) {
            const markAsRead = async () => {
                try {
                    const statusDocRef = doc(db, `artifacts/${appId}/forum`, `support_chat_${userId}`);
                    await setDoc(statusDocRef, {
                        hasUnreadUser: false
                    }, { merge: true });
                    setHasNewMessage(false);
                    setUnreadCount(0);
                } catch (e) {
                    console.error("Error marking messages as read:", e);
                }
            };
            markAsRead();
        }
    }, [isOpen, userId]);

    // Scroll to bottom on open
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen]);

    // Listen to custom events to toggle/open chat from mobile header
    useEffect(() => {
        const handleToggleChat = () => setIsOpen(prev => !prev);
        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('toggle-support-chat', handleToggleChat);
        window.addEventListener('open-support-chat', handleOpenChat);
        return () => {
            window.removeEventListener('toggle-support-chat', handleToggleChat);
            window.removeEventListener('open-support-chat', handleOpenChat);
        };
    }, []);

    // Handle image select & convert to base64 with compression
    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Giới hạn 2MB cho file đầu vào
        if (file.size > 2 * 1024 * 1024) {
            alert('Hình ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 2 MB.');
            return;
        }

        setLoading(true);
        try {
            const compressedBase64 = await compressImage(file);
            setSelectedImage(compressedBase64);
        } catch (error) {
            console.error("Lỗi khi nén ảnh:", error);
            alert("Lỗi khi xử lý hình ảnh.");
        } finally {
            setLoading(false);
        }
    };

    // Handle paste event (e.g. Ctrl+V image) with compression
    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (!file) continue;

                // Giới hạn 2MB cho file dán vào
                if (file.size > 2 * 1024 * 1024) {
                    alert('Hình ảnh dán quá lớn! Vui lòng chọn ảnh nhỏ hơn 2 MB.');
                    return;
                }

                setLoading(true);
                try {
                    const compressedBase64 = await compressImage(file);
                    setSelectedImage(compressedBase64);
                } catch (error) {
                    console.error("Lỗi khi nén ảnh dán:", error);
                } finally {
                    setLoading(false);
                }
                e.preventDefault(); // Prevent pasting binary text/file name in text input
                break;
            }
        }
    };

    // Send Message
    const handleSendMessage = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if ((!inputText.trim() && !selectedImage) || sending || !userId) return;

        setSending(true);
        const textToSend = inputText.trim();
        const imageToSend = selectedImage;

        // Reset textarea height to default
        if (textareaRef.current) {
            textareaRef.current.style.height = '36px';
        }

        // Clear input early for better UX
        setInputText('');
        setSelectedImage(null);

        try {
            await addDoc(collection(db, chatPath), {
                userId,
                senderId: userId,
                senderName: profile?.displayName || 'Người dùng',
                text: textToSend,
                imageUrl: imageToSend || null,
                isAdmin: false,
                isSupportChat: true,
                createdAt: serverTimestamp()
            });

            await setDoc(statusDocRef, {
                isSupportChat: true,
                userId,
                senderName: profile?.displayName || 'Người dùng',
                email: profile?.email || '',
                text: textToSend,
                isAdminReply: false,
                hasUnreadAdmin: true,
                hasUnreadUser: false,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Trigger scroll
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error("Error sending support message:", error);
            // Restore input on failure
            setInputText(textToSend);
            setSelectedImage(imageToSend);
            alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`hidden lg:flex fixed bottom-6 right-6 z-55 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer bg-[#2E5B70] shadow-[#2E5B70]/30 ${isOpen ? 'opacity-100' : 'opacity-50 hover:opacity-100 focus:opacity-100 active:opacity-100'}`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 animate-fade-in" />
                ) : (
                    <div className="relative">
                        <MessageSquare className="w-6 h-6 animate-fade-in" />
                        {hasNewMessage && (
                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                        )}
                    </div>
                )}
            </button>

            {/* Chatbox Container */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-55 w-[330px] sm:w-[380px] h-[480px] sm:h-[520px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-fade-in font-sans">
                    {/* Header */}
                    <div className="bg-[#2E5B70] p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold leading-none">Hỗ trợ & Báo lỗi</h3>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-white/80 font-medium">Phản hồi trong vài phút</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Message Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 space-y-3">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-[#2E5B70] animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-semibold text-slate-500">Xin chào!</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Bạn có thể gửi phản hồi lỗi, đính kèm ảnh chụp màn hình hoặc yêu cầu hỗ trợ ở đây. Ban quản trị sẽ phản hồi sớm nhất có thể.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isSelf = !msg.isAdmin;
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
                                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                                    >
                                        <span className="text-[9px] text-slate-400 font-bold mb-0.5 px-1">
                                            {isSelf ? 'Bạn' : 'Hỗ trợ QuizKi'}
                                            {formattedTime && <span className="font-normal text-slate-400/85 dark:text-slate-500/85 ml-1.5">{formattedTime}</span>}
                                        </span>
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                                                isSelf
                                                    ? 'bg-[#2E5B70] text-white rounded-tr-none'
                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-150/40 dark:border-slate-700/50'
                                            }`}
                                        >
                                            {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                                            {msg.imageUrl && (
                                                <div className={`mt-2 rounded-lg overflow-hidden max-w-[200px] border border-black/5 dark:border-white/5`}>
                                                    <img 
                                                        src={msg.imageUrl} 
                                                        alt="Đính kèm" 
                                                        className="w-full h-auto object-cover max-h-40 cursor-pointer"
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

                    {/* Input Panel */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2">
                        {/* Clip Button for Image */}
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
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            onPaste={handlePaste}
                            className="flex-1 py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#2E5B70] text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none max-h-[120px] min-h-[36px] leading-relaxed scrollbar-hide"
                            placeholder="Nhập nội dung tin nhắn..."
                        />

                        {/* Send Button */}
                        <button
                            type="submit"
                            disabled={(!inputText.trim() && !selectedImage) || sending}
                            className="p-2.5 rounded-xl bg-[#2E5B70] hover:bg-[#254A5C] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default FeedbackChatbox;
