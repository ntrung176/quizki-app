import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, limit, getDocs, onSnapshot,
    serverTimestamp, increment
} from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { ROUTES } from '../../router';
import {
    ArrowLeft, Settings, Pencil, X, Check, MessageSquare,
    Heart, Users, BookOpen, Award, Flame, ExternalLink,
    Calendar, MapPin, Link as LinkIcon, ChevronRight,
    MessageCircle, Eye, Crown, Shield, Loader2
} from 'lucide-react';

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

const AvatarDisplay = ({ avatar, name, size = 'w-20 h-20', textSize = 'text-2xl' }) => {
    if (isCustomPhoto(avatar)) {
        return (
            <div className={`${size} rounded-full overflow-hidden flex-shrink-0 border-[3px] border-white dark:border-gray-700 shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-800`}>
                <img src={avatar} alt="" className="w-full h-full object-cover" />
            </div>
        );
    }
    const emoji = AVATAR_EMOJIS[avatar];
    return (
        <div className={`${size} rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-800 border-[3px] border-white dark:border-gray-700 ${emoji ? 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40' : 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold'}`}>
            {emoji ? <span className={textSize === 'text-2xl' ? 'text-3xl' : textSize}>{emoji}</span> : <span className={textSize}>{(name || 'U')[0].toUpperCase()}</span>}
        </div>
    );
};

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

// JLPT Levels
const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

// ==========================
// EDIT PROFILE MODAL
// ==========================
const EditProfileModal = ({ profileData, onClose, onSave }) => {
    const [bio, setBio] = useState(profileData?.bio || '');
    const [jlptLevel, setJlptLevel] = useState(profileData?.jlptLevel || '');
    const [link, setLink] = useState(profileData?.link || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave({ bio: bio.trim(), jlptLevel, link: link.trim() });
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-indigo-500" />
                        Chỉnh sửa hồ sơ
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Bio */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 block">Giới thiệu bản thân</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Viết vài dòng giới thiệu bản thân..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                            rows={3}
                            maxLength={150}
                        />
                        <p className="text-right text-[10px] text-gray-400 mt-0.5">{bio.length}/150</p>
                    </div>

                    {/* JLPT Level */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 block">Cấp độ JLPT đang học</label>
                        <div className="flex gap-2">
                            {JLPT_LEVELS.map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setJlptLevel(jlptLevel === lvl ? '' : lvl)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${jlptLevel === lvl
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Link */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 block flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Liên kết (tuỳ chọn)
                        </label>
                        <input
                            type="url"
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            maxLength={100}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================
// REPLY MINI CARD (for replies tab)
// ==========================
const ReplyMiniCard = ({ reply }) => {
    return (
        <Link
            to={ROUTES.FORUM}
            className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-all group"
        >
            <div className="flex items-start gap-3">
                <div className="w-1 h-full min-h-[40px] bg-indigo-200 dark:bg-indigo-800 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            Trả lời trong bài của <span className="font-bold text-gray-500 dark:text-gray-300">{reply.postAuthorName || 'ai đó'}</span>
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                    </div>
                    {reply.postTitle && (
                        <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {reply.postTitle}
                        </p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">{reply.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Heart className={`w-3 h-3 ${reply.likes?.length > 0 ? 'text-red-400' : ''}`} />
                            {reply.likes?.length || 0}
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-1 group-hover:text-indigo-400 transition-colors" />
            </div>
        </Link>
    );
};

// ==========================
// POST MINI CARD (for profile feed)
// ==========================
const PostMiniCard = ({ post }) => {
    const CATEGORIES = {
        question: { icon: '❓', label: 'Hỏi đáp', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
        grammar: { icon: '📝', label: 'Ngữ pháp', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
        vocab: { icon: '📚', label: 'Từ vựng', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
        kanji: { icon: '🈁', label: 'Kanji', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
        tips: { icon: '💡', label: 'Mẹo học', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
        share: { icon: '🌟', label: 'Chia sẻ', color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400' },
        other: { icon: '💬', label: 'Khác', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400' },
    };
    const cat = CATEGORIES[post.category] || CATEGORIES.other;

    return (
        <Link
            to={ROUTES.FORUM}
            className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-all group"
        >
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}>
                            {cat.icon} {cat.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(post.createdAt)}</span>
                    </div>
                    {post.title && (
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {post.title}
                        </h4>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{post.content}</p>

                    {/* Tags */}
                    {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {post.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[9px] font-medium text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-full">#{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Heart className={`w-3 h-3 ${post.likes?.length > 0 ? 'text-red-400' : ''}`} />
                            {post.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MessageCircle className="w-3 h-3" />
                            {post.commentCount || 0}
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-1 group-hover:text-indigo-400 transition-colors" />
            </div>
        </Link>
    );
};

// ==========================
// MAIN USER PROFILE SCREEN
// ==========================
const UserProfileScreen = ({ userId: currentUserId, profile: currentProfile, isAdmin }) => {
    const { userId: paramUserId } = useParams();
    const navigate = useNavigate();

    // Determine which profile to show
    const targetUserId = (!paramUserId || paramUserId === 'me') ? currentUserId : paramUserId;
    const isSelf = targetUserId === currentUserId;

    const [profileData, setProfileData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [userReplies, setUserReplies] = useState([]);
    const [likedPosts, setLikedPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('posts');
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [loadingLikes, setLoadingLikes] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const profilesPath = useMemo(() => `artifacts/${appId}/userProfiles`, []);
    const followsPath = useMemo(() => `artifacts/${appId}/follows`, []);
    const forumPath = useMemo(() => `artifacts/${appId}/forum`, []);

    // Load profile data
    useEffect(() => {
        if (!targetUserId) return;
        setLoading(true);

        const loadProfile = async () => {
            try {
                const profileRef = doc(db, profilesPath, targetUserId);
                const profileSnap = await getDoc(profileRef);

                if (profileSnap.exists()) {
                    const existingData = profileSnap.data();
                    // Auto-sync display name & avatar from main profile if self
                    if (isSelf && currentProfile) {
                        const updates = {};
                        if (currentProfile.displayName && currentProfile.displayName !== existingData.displayName) {
                            updates.displayName = currentProfile.displayName;
                        }
                        if (currentProfile.avatar && currentProfile.avatar !== existingData.avatar) {
                            updates.avatar = currentProfile.avatar;
                        }
                        if (Object.keys(updates).length > 0) {
                            await updateDoc(profileRef, { ...updates, updatedAt: serverTimestamp() });
                            Object.assign(existingData, updates);
                        }
                    }
                    setProfileData({ id: profileSnap.id, ...existingData });
                } else {
                    // Profile doesn't exist yet — create default if it's self
                    if (isSelf && currentProfile) {
                        const defaultProfile = {
                            displayName: currentProfile.displayName || 'Ẩn danh',
                            avatar: currentProfile.avatar || '',
                            bio: '',
                            jlptLevel: '',
                            link: '',
                            postCount: 0,
                            followerCount: 0,
                            followingCount: 0,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        };
                        await setDoc(profileRef, defaultProfile);
                        setProfileData({ id: targetUserId, ...defaultProfile });
                    } else {
                        // Viewing someone else's non-existent profile
                        setProfileData(null);
                    }
                }
            } catch (e) {
                console.error('Load profile error:', e);
            }
            setLoading(false);
        };

        loadProfile();
    }, [targetUserId, isSelf, currentProfile, profilesPath]);

    // Load user's posts
    useEffect(() => {
        if (!targetUserId) return;
        setLoadingPosts(true);

        const loadPosts = async () => {
            try {
                const postsRef = collection(db, forumPath);
                const q = query(postsRef, where('authorId', '==', targetUserId));
                const snap = await getDocs(q);
                const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                posts.sort((a, b) => {
                    const ta = a.createdAt?.toDate?.()?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
                    const tb = b.createdAt?.toDate?.()?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
                    return tb - ta;
                });
                setUserPosts(posts);
            } catch (e) {
                console.error('Load user posts error:', e);
            }
            setLoadingPosts(false);
        };

        loadPosts();
    }, [targetUserId, forumPath]);

    // Check follow status & counts
    useEffect(() => {
        if (!targetUserId || isSelf) return;

        const checkFollow = async () => {
            try {
                const followDocId = `${currentUserId}_${targetUserId}`;
                const followRef = doc(db, followsPath, followDocId);
                const followSnap = await getDoc(followRef);
                setIsFollowing(followSnap.exists());
            } catch (e) {
                console.error('Check follow error:', e);
            }
        };

        checkFollow();
    }, [targetUserId, currentUserId, isSelf, followsPath]);

    // Load follower/following counts
    useEffect(() => {
        if (!targetUserId) return;

        const loadCounts = async () => {
            try {
                // Followers: docs where followingId == targetUserId
                const followersQ = query(collection(db, followsPath), where('followingId', '==', targetUserId));
                const followersSnap = await getDocs(followersQ);
                setFollowerCount(followersSnap.size);

                // Following: docs where followerId == targetUserId
                const followingQ = query(collection(db, followsPath), where('followerId', '==', targetUserId));
                const followingSnap = await getDocs(followingQ);
                setFollowingCount(followingSnap.size);
            } catch (e) {
                console.error('Load counts error:', e);
            }
        };

        loadCounts();
    }, [targetUserId, followsPath, isFollowing]);

    // Load replies when tab is selected
    useEffect(() => {
        if (activeTab !== 'replies' || !targetUserId) return;
        if (userReplies.length > 0) return; // Already loaded
        setLoadingReplies(true);

        const loadReplies = async () => {
            try {
                // We need to scan all posts' comment subcollections
                // Since Firestore doesn't support collectionGroup queries without indexes,
                // we'll load all posts first and then check each one's comments
                const postsRef = collection(db, forumPath);
                const postsSnap = await getDocs(postsRef);
                const allReplies = [];

                for (const postDoc of postsSnap.docs) {
                    const postData = postDoc.data();
                    const commentsRef = collection(db, forumPath, postDoc.id, 'comments');
                    const commentsQ = query(commentsRef, where('authorId', '==', targetUserId));
                    const commentsSnap = await getDocs(commentsQ);

                    for (const commentDoc of commentsSnap.docs) {
                        allReplies.push({
                            id: commentDoc.id,
                            ...commentDoc.data(),
                            postId: postDoc.id,
                            postTitle: postData.title || '',
                            postAuthorName: postData.authorName || 'Ẩn danh',
                        });
                    }
                }

                allReplies.sort((a, b) => {
                    const ta = a.createdAt?.toDate?.()?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
                    const tb = b.createdAt?.toDate?.()?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
                    return tb - ta;
                });

                setUserReplies(allReplies);
            } catch (e) {
                console.error('Load replies error:', e);
            }
            setLoadingReplies(false);
        };

        loadReplies();
    }, [activeTab, targetUserId, forumPath, userReplies.length]);

    // Load liked posts when tab is selected
    useEffect(() => {
        if (activeTab !== 'likes' || !isSelf || !targetUserId) return;
        if (likedPosts.length > 0) return; // Already loaded
        setLoadingLikes(true);

        const loadLikedPosts = async () => {
            try {
                const postsRef = collection(db, forumPath);
                const postsSnap = await getDocs(postsRef);
                const liked = [];

                for (const postDoc of postsSnap.docs) {
                    const postData = postDoc.data();
                    if (postData.likes?.includes(targetUserId)) {
                        liked.push({ id: postDoc.id, ...postData });
                    }
                }

                liked.sort((a, b) => {
                    const ta = a.createdAt?.toDate?.()?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
                    const tb = b.createdAt?.toDate?.()?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
                    return tb - ta;
                });

                setLikedPosts(liked);
            } catch (e) {
                console.error('Load liked posts error:', e);
            }
            setLoadingLikes(false);
        };

        loadLikedPosts();
    }, [activeTab, isSelf, targetUserId, forumPath, likedPosts.length]);

    // Handle follow/unfollow
    const handleToggleFollow = async () => {
        if (followLoading || isSelf) return;
        setFollowLoading(true);

        const followDocId = `${currentUserId}_${targetUserId}`;
        const followRef = doc(db, followsPath, followDocId);

        try {
            if (isFollowing) {
                await deleteDoc(followRef);
                setIsFollowing(false);
                setFollowerCount(prev => Math.max(0, prev - 1));
            } else {
                await setDoc(followRef, {
                    followerId: currentUserId,
                    followingId: targetUserId,
                    followerName: currentProfile?.displayName || 'Ẩn danh',
                    followerAvatar: currentProfile?.avatar || '',
                    createdAt: serverTimestamp(),
                });
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);
            }
        } catch (e) {
            console.error('Follow error:', e);
        }
        setFollowLoading(false);
    };

    // Handle save profile
    const handleSaveProfile = async (updates) => {
        try {
            const profileRef = doc(db, profilesPath, targetUserId);
            await updateDoc(profileRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });
            setProfileData(prev => ({ ...prev, ...updates }));
        } catch (e) {
            console.error('Save profile error:', e);
        }
    };

    // Get display info (use profile data or fallback to currentProfile for self)
    const displayName = profileData?.displayName || (isSelf ? currentProfile?.displayName : 'Người dùng');
    const displayAvatar = profileData?.avatar || (isSelf ? currentProfile?.avatar : '');
    const displayBio = profileData?.bio || '';
    const displayJlpt = profileData?.jlptLevel || '';
    const displayLink = profileData?.link || '';

    // Tabs config
    const tabs = [
        { id: 'posts', label: 'Bài viết', icon: MessageSquare, count: userPosts.length },
        { id: 'replies', label: 'Trả lời', icon: MessageCircle, count: userReplies.length > 0 ? userReplies.length : null },
    ];
    if (isSelf) {
        tabs.push({ id: 'likes', label: 'Đã thích', icon: Heart, count: likedPosts.length > 0 ? likedPosts.length : null });
    }

    if (loading) {
        return (
            <div className="max-w-xl mx-auto flex flex-col items-center gap-3 py-20">
                <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Đang tải hồ sơ...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto space-y-0">
            {/* Header bar */}
            <div className="flex items-center gap-3 pb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-black text-gray-800 dark:text-gray-100">{displayName}</h2>
                    <p className="text-[11px] text-gray-400">{userPosts.length} bài viết</p>
                </div>
                {isSelf && (
                    <Link to={ROUTES.SETTINGS} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                        <Settings className="w-5 h-5" />
                    </Link>
                )}
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Cover gradient */}
                <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                    {/* Avatar - positioned to overlap */}
                    <div className="absolute -bottom-10 left-5">
                        <AvatarDisplay avatar={displayAvatar} name={displayName} size="w-20 h-20" textSize="text-2xl" />
                    </div>
                </div>

                {/* Profile info */}
                <div className="pt-12 px-5 pb-5">
                    {/* Action button */}
                    <div className="flex justify-end mb-3">
                        {isSelf ? (
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="px-4 py-2 rounded-full border-2 border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-1.5"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Chỉnh sửa hồ sơ
                            </button>
                        ) : (
                            <button
                                onClick={handleToggleFollow}
                                disabled={followLoading}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${isFollowing
                                    ? 'border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-red-300 hover:text-red-500 dark:hover:border-red-700'
                                    : 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-600'
                                    }`}
                            >
                                {followLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isFollowing ? (
                                    <>
                                        <Users className="w-3.5 h-3.5" />
                                        Đang theo dõi
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-3.5 h-3.5" />
                                        Theo dõi
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Name & badges */}
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">{displayName}</h1>

                        {/* Bio */}
                        {displayBio && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{displayBio}</p>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {displayJlpt && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                    <Award className="w-3 h-3" /> {displayJlpt} Student
                                </span>
                            )}
                            {isAdmin && targetUserId === currentUserId && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                    <Shield className="w-3 h-3" /> Admin
                                </span>
                            )}
                        </div>

                        {/* Link */}
                        {displayLink && (
                            <a
                                href={displayLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium mt-1"
                            >
                                <LinkIcon className="w-3 h-3" />
                                {displayLink.replace(/^https?:\/\//, '').slice(0, 30)}
                                <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-center">
                            <p className="text-lg font-black text-gray-800 dark:text-white">{userPosts.length}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Bài viết</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black text-gray-800 dark:text-white">{followerCount}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Người theo dõi</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black text-gray-800 dark:text-white">{followingCount}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Đang theo dõi</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-none mt-0">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition-all relative ${isActive
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {tab.count !== null && <span className="text-[10px] opacity-60">({tab.count})</span>}
                            {isActive && (
                                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="mt-3 space-y-3 pb-8">
                {activeTab === 'posts' && (
                    <>
                        {loadingPosts ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : userPosts.length > 0 ? (
                            userPosts.map(post => (
                                <PostMiniCard key={post.id} post={post} />
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">Chưa có bài viết nào</p>
                                {isSelf && (
                                    <Link
                                        to={ROUTES.FORUM}
                                        className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-full shadow-md shadow-indigo-500/25 hover:bg-indigo-600 transition-all"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" /> Đăng bài trên diễn đàn
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'replies' && (
                    <>
                        {loadingReplies ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : userReplies.length > 0 ? (
                            userReplies.map(reply => (
                                <ReplyMiniCard key={reply.id} reply={reply} />
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageCircle className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">Chưa có trả lời nào</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'likes' && isSelf && (
                    <>
                        {loadingLikes ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : likedPosts.length > 0 ? (
                            likedPosts.map(post => (
                                <PostMiniCard key={post.id} post={post} />
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Heart className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">Chưa thích bài viết nào</p>
                                <Link
                                    to={ROUTES.FORUM}
                                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-full shadow-md shadow-indigo-500/25 hover:bg-indigo-600 transition-all"
                                >
                                    <Heart className="w-3.5 h-3.5" /> Khám phá diễn đàn
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <EditProfileModal
                    profileData={profileData}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleSaveProfile}
                />
            )}
        </div>
    );
};

export default UserProfileScreen;
