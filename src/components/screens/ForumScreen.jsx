import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy,
    onSnapshot, serverTimestamp, arrayUnion, arrayRemove, where, limit, getDocs
} from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    MessageSquare, Send, Heart, ArrowLeft, Plus, X, ChevronDown,
    MoreHorizontal, Trash2, Flag, Clock, TrendingUp, Search,
    Filter, Tag, Edit3, MessageCircle, ThumbsUp, Eye, EyeOff, Pin, Users, Pencil, Check
} from 'lucide-react';
import { ROUTES } from '../../router';

// ==========================
// AVATAR EMOJIS (reuse)
// ==========================
const AVATAR_EMOJIS = {
    fox: '🦊', cat: '🐱', dog: '🐶', rabbit: '🐰', bear: '🐻',
    panda: '🐼', koala: '🐨', tiger: '🐯', lion: '🦁', cow: '🐮',
    pig: '🐷', mouse: '🐭', hamster: '🐹', penguin: '🐧', chicken: '🐔',
    duck: '🦆', owl: '🦉', eagle: '🦅', parrot: '🦜', flamingo: '🦩',
    frog: '🐸', turtle: '🐢', snake: '🐍', dragon: '🐉', whale: '🐳',
    dolphin: '🐬', octopus: '🐙', fish: '🐠', shark: '🦈', butterfly: '🦋',
    bee: '🐝', ladybug: '🐞', snail: '🐌', monkey: '🐵', gorilla: '🦍',
    horse: '🐴', unicorn: '🦄', zebra: '🦓', giraffe: '🦒', elephant: '🐘',
    rhino: '🦏', hippo: '🦛', camel: '🐫', deer: '🦌', wolf: '🐺',
    bat: '🦇', raccoon: '🦝', sloth: '🦥', hedgehog: '🦔', shrimp: '🦐',
};

const isCustomPhoto = (v) => typeof v === 'string' && v.startsWith('data:image/');

const AvatarDisplay = ({ avatar, name, size = 'w-9 h-9', textSize = 'text-sm' }) => {
    if (isCustomPhoto(avatar)) {
        return (
            <div className={`${size} rounded-full overflow-hidden flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm`}>
                <img src={avatar} alt="" className="w-full h-full object-cover" />
            </div>
        );
    }
    const emoji = AVATAR_EMOJIS[avatar];
    return (
        <div className={`${size} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${emoji ? 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40' : 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold'}`}>
            {emoji ? <span className={textSize === 'text-sm' ? 'text-lg' : 'text-xl'}>{emoji}</span> : <span className={textSize}>{(name || 'U')[0].toUpperCase()}</span>}
        </div>
    );
};

// ==========================
// CATEGORIES
// ==========================
const CATEGORIES = [
    { id: 'all', label: 'Tất cả', icon: '📋', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    { id: 'question', label: 'Hỏi đáp', icon: '❓', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { id: 'grammar', label: 'Ngữ pháp', icon: '📝', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    { id: 'vocab', label: 'Từ vựng', icon: '📚', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    { id: 'kanji', label: 'Kanji', icon: '🈁', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    { id: 'tips', label: 'Mẹo học', icon: '💡', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    { id: 'share', label: 'Chia sẻ', icon: '🌟', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
    { id: 'other', label: 'Khác', icon: '💬', color: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300' },
];

const getCategoryById = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];

// ==========================
// TIME AGO
// ==========================
const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const ts = timestamp?.toDate ? timestamp.toDate().getTime() : (timestamp?.seconds ? timestamp.seconds * 1000 : timestamp);
    const diff = Math.floor((now - ts) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

// ==========================
// COMMENT COMPONENT
// ==========================
const CommentItem = ({ comment, userId, onDelete, onLike, onReply, onEdit, onHide, isAdmin, isPostOwner }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [saving, setSaving] = useState(false);
    const isLiked = comment.likes?.includes(userId);
    const isOwner = comment.authorId === userId;
    const isReply = !!comment.parentId;
    const isHidden = comment.hidden === true;

    // If hidden and viewer is not the post owner / admin, don't render
    if (isHidden && !isPostOwner && !isAdmin) return null;

    const handleSaveEdit = async () => {
        const trimmed = editText.trim();
        if (!trimmed || saving) return;
        setSaving(true);
        await onEdit(comment.id, trimmed);
        setSaving(false);
        setIsEditing(false);
    };

    return (
        <div className={`flex gap-2.5 group ${isReply ? 'ml-8 mt-1.5 relative' : ''} ${isHidden ? 'opacity-50' : ''}`}>
            {isReply && <div className="absolute -left-4 top-0 w-3 h-4 border-l-2 border-b-2 border-gray-200 dark:border-gray-600 rounded-bl-lg" />}
            <Link to={`/profile/${comment.authorId}`}>
                <AvatarDisplay avatar={comment.authorAvatar} name={comment.authorName} size="w-7 h-7" textSize="text-xs" />
            </Link>
            <div className="flex-1 min-w-0">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3.5 py-2.5 relative">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Link to={`/profile/${comment.authorId}`} className="font-bold text-xs text-gray-800 dark:text-gray-200 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                            {comment.authorName || '\u1ea8n danh'}
                        </Link>
                        <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                        {comment.editedAt && <span className="text-[9px] text-gray-400 italic">(đã sửa)</span>}
                        {isHidden && <span className="text-[9px] text-amber-500 font-bold flex items-center gap-0.5"><EyeOff className="w-2.5 h-2.5" /> Đã ẩn</span>}
                    </div>

                    {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                            <input
                                type="text"
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20"
                                maxLength={500}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                                autoFocus
                            />
                            <div className="flex gap-1.5">
                                <button onClick={handleSaveEdit} disabled={saving || !editText.trim()} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 disabled:opacity-40">
                                    <Check className="w-3 h-3" /> Lưu
                                </button>
                                <button onClick={() => { setIsEditing(false); setEditText(comment.content); }} className="text-[10px] font-bold text-gray-400 hover:text-gray-600">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{comment.content}</p>
                    )}

                    {/* Menu */}
                    {(isOwner || isAdmin || isPostOwner) && !isEditing && (
                        <div className="absolute top-1.5 right-1.5">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-7 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]">
                                        {isOwner && (
                                            <button
                                                onClick={() => { setIsEditing(true); setEditText(comment.content); setShowMenu(false); }}
                                                className="w-full text-left px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                            >
                                                <Pencil className="w-3 h-3" /> Chỉnh sửa
                                            </button>
                                        )}
                                        {isPostOwner && !isOwner && (
                                            <button
                                                onClick={() => { onHide(comment.id, !isHidden); setShowMenu(false); }}
                                                className="w-full text-left px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                                            >
                                                {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                {isHidden ? 'Hiện bình luận' : 'Ẩn bình luận'}
                                            </button>
                                        )}
                                        {(isOwner || isAdmin) && (
                                            <button
                                                onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                                                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3 h-3" /> Xóa
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isEditing && (
                    <div className="flex items-center gap-3 mt-1 ml-1">
                        <button
                            onClick={() => onLike(comment.id)}
                            className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                        >
                            <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                            {(comment.likes?.length || 0) > 0 && <span>{comment.likes.length}</span>}
                        </button>
                        <button
                            onClick={() => onReply(comment)}
                            className="text-[11px] font-medium text-gray-400 hover:text-indigo-500 transition-colors"
                        >
                            Phản hồi
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================
// POST COMPONENT
// ==========================
const PostItem = ({ post, userId, isAdmin, forumPath, profile }) => {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title || '');
    const [editContent, setEditContent] = useState(post.content || '');
    const [savingEdit, setSavingEdit] = useState(false);
    const commentInputRef = useRef(null);

    const isLiked = post.likes?.includes(userId);
    const isOwner = post.authorId === userId;
    const category = getCategoryById(post.category);

    // Load comments when expanded
    useEffect(() => {
        if (!showComments) return;
        setLoadingComments(true);
        const commentsRef = collection(db, forumPath, post.id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingComments(false);
        });
        return () => unsub();
    }, [showComments, post.id, forumPath]);

    // Focus comment input when opening comments
    useEffect(() => {
        if (showComments && commentInputRef.current) {
            setTimeout(() => commentInputRef.current?.focus(), 200);
        }
    }, [showComments]);

    const handleLikePost = async () => {
        const postRef = doc(db, forumPath, post.id);
        try {
            if (isLiked) {
                await updateDoc(postRef, { likes: arrayRemove(userId) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(userId) });
            }
        } catch (e) { console.error('Like error:', e); }
    };

    const handleLikeComment = async (commentId) => {
        const commentRef = doc(db, forumPath, post.id, 'comments', commentId);
        const comment = comments.find(c => c.id === commentId);
        const alreadyLiked = comment?.likes?.includes(userId);
        try {
            if (alreadyLiked) {
                await updateDoc(commentRef, { likes: arrayRemove(userId) });
            } else {
                await updateDoc(commentRef, { likes: arrayUnion(userId) });
            }
        } catch (e) { console.error('Like comment error:', e); }
    };

    const handleDeleteComment = async (commentId) => {
        if (!confirm('Xóa bình luận này?')) return;
        try {
            await deleteDoc(doc(db, forumPath, post.id, 'comments', commentId));
            await updateDoc(doc(db, forumPath, post.id), {
                commentCount: Math.max(0, (post.commentCount || 1) - 1)
            });
        } catch (e) { console.error('Delete comment error:', e); }
    };

    const handleEditComment = async (commentId, newContent) => {
        try {
            await updateDoc(doc(db, forumPath, post.id, 'comments', commentId), {
                content: newContent,
                editedAt: serverTimestamp(),
            });
        } catch (e) { console.error('Edit comment error:', e); }
    };

    const handleHideComment = async (commentId, hide) => {
        try {
            await updateDoc(doc(db, forumPath, post.id, 'comments', commentId), {
                hidden: hide,
            });
        } catch (e) { console.error('Hide comment error:', e); }
    };

    const handleReplyClick = (comment) => {
        setReplyingTo(comment);
        if (commentInputRef.current) {
            commentInputRef.current.focus();
        }
    };

    const handleDeletePost = async () => {
        if (!confirm('Xóa bài viết này?')) return;
        try {
            await deleteDoc(doc(db, forumPath, post.id));
        } catch (e) { console.error('Delete post error:', e); }
    };

    const handleEditPost = async () => {
        if (!editContent.trim() || savingEdit) return;
        setSavingEdit(true);
        try {
            await updateDoc(doc(db, forumPath, post.id), {
                title: editTitle.trim(),
                content: editContent.trim(),
                editedAt: serverTimestamp(),
            });
            setIsEditingPost(false);
        } catch (e) { console.error('Edit post error:', e); }
        setSavingEdit(false);
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        const trimmed = commentText.trim();
        if (!trimmed || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const commentsRef = collection(db, forumPath, post.id, 'comments');
            const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : null;

            // If replying to a reply, prefix the username so people know who it's addressed to
            const finalContent = (replyingTo && replyingTo.parentId) ? `@${replyingTo.authorName} ${trimmed}` : trimmed;

            await addDoc(commentsRef, {
                content: finalContent,
                authorId: userId,
                authorName: profile?.displayName || 'Ẩn danh',
                authorAvatar: profile?.avatar || '',
                likes: [],
                parentId: parentId,
                createdAt: serverTimestamp(),
            });
            // Increment comment count
            await updateDoc(doc(db, forumPath, post.id), {
                commentCount: (post.commentCount || 0) + 1
            });
            setCommentText('');
            setReplyingTo(null);
        } catch (e) { console.error('Comment error:', e); }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Post Header */}
            <div className="p-4 pb-2">
                <div className="flex items-center gap-3 mb-3">
                    <Link to={`/profile/${post.authorId}`}>
                        <AvatarDisplay avatar={post.authorAvatar} name={post.authorName} />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/profile/${post.authorId}`} className="font-bold text-sm text-gray-800 dark:text-white hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                                {post.authorName || '\u1ea8n danh'}
                            </Link>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${category.color}`}>
                                {category.icon} {category.label}
                            </span>
                        </div>
                        <span className="text-[11px] text-gray-400">{timeAgo(post.createdAt)}</span>
                    </div>

                    {/* Post menu */}
                    {(isOwner || isAdmin) && (
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
                                        {isOwner && (
                                            <button
                                                onClick={() => {
                                                    setIsEditingPost(true);
                                                    setEditTitle(post.title || '');
                                                    setEditContent(post.content || '');
                                                    setShowMenu(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 font-medium"
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa bài viết
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { handleDeletePost(); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-medium"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Xóa bài viết
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Post Content */}
                {isEditingPost ? (
                    <div className="space-y-2 mt-1">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Tiêu đề"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                            maxLength={150}
                        />
                        <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                            rows={4}
                            maxLength={2000}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleEditPost}
                                disabled={!editContent.trim() || savingEdit}
                                className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-colors"
                            >
                                {savingEdit ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Lưu thay đổi
                            </button>
                            <button
                                onClick={() => setIsEditingPost(false)}
                                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {post.title && (
                            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1.5 leading-snug">
                                {post.title}
                                {post.editedAt && <span className="text-[10px] text-gray-400 font-normal ml-2 italic">(đã sửa)</span>}
                            </h3>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
                        {!post.title && post.editedAt && <span className="text-[10px] text-gray-400 italic">(đã sửa)</span>}
                    </>
                )}

                {/* Tags */}
                {!isEditingPost && post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {post.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">#{tag}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions Bar */}
            <div className="px-4 py-2 flex items-center gap-1 border-t border-gray-50 dark:border-gray-700/50">
                <button
                    onClick={handleLikePost}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isLiked
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes?.length || 0}</span>
                    <span className="hidden sm:inline">Thích</span>
                </button>
                <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showComments
                        ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentCount || 0}</span>
                    <span className="hidden sm:inline">Bình luận</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700/50">
                    {/* Comments list */}
                    <div className="space-y-4 mt-3 max-h-80 overflow-y-auto pr-1">
                        {loadingComments ? (
                            <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : comments.length > 0 ? (() => {
                            const parentComments = comments.filter(c => !c.parentId);
                            const repliesByParent = comments.reduce((acc, c) => {
                                if (c.parentId) {
                                    if (!acc[c.parentId]) acc[c.parentId] = [];
                                    acc[c.parentId].push(c);
                                }
                                return acc;
                            }, {});

                            return parentComments.map(c => (
                                <div key={c.id} className="space-y-3">
                                    <CommentItem
                                        comment={c}
                                        userId={userId}
                                        isAdmin={isAdmin}
                                        isPostOwner={isOwner}
                                        onDelete={handleDeleteComment}
                                        onLike={handleLikeComment}
                                        onReply={handleReplyClick}
                                        onEdit={handleEditComment}
                                        onHide={handleHideComment}
                                    />
                                    {repliesByParent[c.id]?.map(r => (
                                        <CommentItem
                                            key={r.id}
                                            comment={r}
                                            userId={userId}
                                            isAdmin={isAdmin}
                                            isPostOwner={isOwner}
                                            onDelete={handleDeleteComment}
                                            onLike={handleLikeComment}
                                            onReply={handleReplyClick}
                                            onEdit={handleEditComment}
                                            onHide={handleHideComment}
                                        />
                                    ))}
                                </div>
                            ));
                        })() : (
                            <p className="text-center text-xs text-gray-400 py-4">Chưa có bình luận. Hãy là người đầu tiên! 💬</p>
                        )}
                    </div>

                    {/* Add comment */}
                    <form onSubmit={handleSubmitComment} className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-2">
                        {replyingTo && (
                            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-xs">
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                    Đang trả lời <span className="font-bold">{replyingTo.authorName}</span>
                                </span>
                                <button type="button" onClick={() => setReplyingTo(null)} className="text-indigo-400 hover:text-indigo-600 p-1">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <AvatarDisplay avatar={profile?.avatar} name={profile?.displayName} size="w-7 h-7" textSize="text-xs" />
                            <div className="flex-1 relative">
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Viết bình luận..."
                                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all pr-10"
                                    maxLength={500}
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim() || isSubmitting}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-600 transition-colors disabled:hover:bg-indigo-500"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

// ==========================
// CREATE POST MODAL
// ==========================
const CreatePostModal = ({ onClose, onSubmit, profile }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('question');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [postStatus, setPostStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
    const contentRef = useRef(null);

    useEffect(() => {
        setTimeout(() => contentRef.current?.focus(), 200);
    }, []);

    // Tag input: nhập #tag rồi Enter hoặc Space để tạo chip
    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            setTags(prev => prev.slice(0, -1));
        }
    };

    const addTag = () => {
        const cleaned = tagInput.trim().replace(/^#/, '').replace(/[,\s]/g, '');
        if (cleaned && !tags.includes(cleaned) && tags.length < 5) {
            setTags(prev => [...prev, cleaned]);
        }
        setTagInput('');
    };

    const removeTag = (idx) => {
        setTags(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;
        setIsSubmitting(true);
        setPostStatus('submitting');
        try {
            // Add last tag if user typed something
            let finalTags = [...tags];
            const lastTag = tagInput.trim().replace(/^#/, '').replace(/[,\s]/g, '');
            if (lastTag && !finalTags.includes(lastTag) && finalTags.length < 5) {
                finalTags.push(lastTag);
            }
            await onSubmit({
                title: title.trim(),
                content: content.trim(),
                category,
                tags: finalTags,
            });
            setPostStatus('success');
            // Đợi hiện thông báo thành công 1 giây rồi đóng
            setTimeout(() => onClose(), 1000);
        } catch (e) {
            setPostStatus('error');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-indigo-500" />
                        Đăng bài mới
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Author */}
                    <div className="flex items-center gap-3">
                        <AvatarDisplay avatar={profile?.avatar} name={profile?.displayName} />
                        <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-white">{profile?.displayName || 'Bạn'}</p>
                            <p className="text-[10px] text-gray-400">Đăng công khai</p>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Danh mục</label>
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`text-xs font-bold px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1 ${category === cat.id
                                        ? 'ring-2 ring-indigo-400 shadow-md ' + cat.color
                                        : cat.color + ' opacity-60 hover:opacity-80'}`}
                                >
                                    {cat.icon} {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title (optional) */}
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Tiêu đề (không bắt buộc)"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                        maxLength={150}
                    />

                    {/* Content */}
                    <textarea
                        ref={contentRef}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Bạn muốn hỏi gì? Chia sẻ kiến thức, thắc mắc về tiếng Nhật..."
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                        rows={5}
                        maxLength={2000}
                    />
                    <p className="text-right text-[10px] text-gray-400 -mt-2">{content.length}/2000</p>

                    {/* Tags - kiểu Facebook: gõ #tag rồi Enter */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Thẻ tag (gõ rồi nhấn Enter)
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[40px] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                            {tags.map((tag, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
                                    #{tag}
                                    <button onClick={() => removeTag(i)} className="hover:text-red-500 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {tags.length < 5 && (
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={addTag}
                                    placeholder={tags.length === 0 ? '#N3, #ngữ pháp..." ' : ''}
                                    className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none border-none"
                                    maxLength={30}
                                />
                            )}
                        </div>
                        {tags.length > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1">{tags.length}/5 thẻ tag</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {/* Status messages */}
                    {postStatus === 'success' && (
                        <div className="mb-3 flex items-center gap-2 justify-center text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-2.5 font-bold">
                            <span>✅</span> Đăng bài thành công!
                        </div>
                    )}
                    {postStatus === 'error' && (
                        <div className="mb-3 flex items-center gap-2 justify-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl py-2.5 font-bold">
                            <span>❌</span> Đăng bài thất bại. Thử lại!
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting || postStatus === 'success'}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {postStatus === 'submitting' ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Đang đăng bài...
                            </>
                        ) : postStatus === 'success' ? (
                            <>
                                <span>✅</span> Đã đăng thành công!
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Đăng bài
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ==========================
// MAIN FORUM SCREEN
// ==========================
const ForumScreen = ({ userId, profile, isAdmin }) => {
    const [posts, setPosts] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'popular'
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [postingStatus, setPostingStatus] = useState('idle'); // 'idle' | 'posting'

    const forumPath = useMemo(() => `artifacts/${appId}/forum`, []);

    // Load posts - try orderBy first, fallback to no-order if index missing
    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const postsRef = collection(db, forumPath);
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));
        const unsub = onSnapshot(q, (snap) => {
            const allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPosts(allPosts);
            setLoading(false);
        }, async (err) => {
            console.warn('Forum onSnapshot with orderBy failed, trying without order:', err.message);
            // Fallback: load without orderBy (no index needed)
            try {
                const fallbackSnap = await getDocs(collection(db, forumPath));
                const allPosts = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort client-side
                allPosts.sort((a, b) => {
                    const ta = a.createdAt?.toDate?.()?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
                    const tb = b.createdAt?.toDate?.()?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
                    return tb - ta;
                });
                setPosts(allPosts);
            } catch (e2) {
                console.error('Forum fallback load error:', e2);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [forumPath]);

    // Create post handler
    const handleCreatePost = async (postData) => {
        setPostingStatus('posting');
        try {
            const postsRef = collection(db, forumPath);
            await addDoc(postsRef, {
                ...postData,
                authorId: userId,
                authorName: profile?.displayName || 'Ẩn danh',
                authorAvatar: (profile?.avatar && !profile.avatar.startsWith('data:image/')) ? profile.avatar : '',
                likes: [],
                commentCount: 0,
                views: 0,
                createdAt: serverTimestamp(),
            });
            // Nếu onSnapshot đang hoạt động, posts sẽ tự cập nhật
            // Nếu không, reload thủ công
            if (posts.length === 0) {
                const snap = await getDocs(collection(db, forumPath));
                const allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                allPosts.sort((a, b) => {
                    const ta = a.createdAt?.toDate?.()?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
                    const tb = b.createdAt?.toDate?.()?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
                    return tb - ta;
                });
                setPosts(allPosts);
            }
        } catch (e) {
            console.error('Create post error:', e);
            throw e; // Re-throw để modal bắt lỗi
        } finally {
            setPostingStatus('idle');
        }
    };

    // Filtered & sorted posts
    const filteredPosts = useMemo(() => {
        let result = [...posts];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.content || '').toLowerCase().includes(q) ||
                (p.authorName || '').toLowerCase().includes(q) ||
                (p.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        // Sort
        if (sortBy === 'popular') {
            result.sort((a, b) => (b.likes?.length || 0) + (b.commentCount || 0) - (a.likes?.length || 0) - (a.commentCount || 0));
        }

        return result;
    }, [posts, sortBy, searchQuery]);

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <Link
                    to={ROUTES.HOME}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                        Diễn đàn
                    </h2>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">Hỏi đáp & chia sẻ về tiếng Nhật</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{posts.length} bài</span>
                </div>
            </div>

            {/* Search & Sort */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm bài viết..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setSortBy(s => s === 'latest' ? 'popular' : 'latest')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${sortBy === 'popular'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    {sortBy === 'latest' ? <Clock className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {sortBy === 'latest' ? 'Mới nhất' : 'Phổ biến'}
                </button>
            </div>



            {/* Create post button */}
            <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"
            >
                <AvatarDisplay avatar={profile?.avatar} name={profile?.displayName} size="w-9 h-9" />
                <span className="text-sm text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors flex-1 text-left">
                    Bạn muốn hỏi gì? Chia sẻ kiến thức...
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-500 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4" />
                </div>
            </button>

            {/* Posts Feed */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Đang tải bài viết...</p>
                    </div>
                ) : filteredPosts.length > 0 ? (
                    filteredPosts.map(post => (
                        <PostItem
                            key={post.id}
                            post={post}
                            userId={userId}
                            isAdmin={isAdmin}
                            forumPath={forumPath}
                            profile={profile}
                        />
                    ))
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-indigo-300" />
                        </div>
                        <h3 className="font-bold text-gray-600 dark:text-gray-300 mb-1">
                            {searchQuery ? 'Không tìm thấy bài viết' : 'Chưa có bài viết nào'}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy là người đầu tiên đặt câu hỏi!'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-600 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Đăng bài đầu tiên
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* FAB - Floating Action Button */}
            {posts.length > 0 && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="fixed bottom-20 right-4 sm:right-8 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform z-30"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Create Post Modal */}
            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreatePost}
                    profile={profile}
                />
            )}
        </div>
    );
};

export default ForumScreen;
