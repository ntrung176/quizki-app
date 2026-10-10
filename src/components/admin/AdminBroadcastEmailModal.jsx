import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    X, Mail, Send, Eye, Edit3, Users, CheckCircle2, 
    AlertCircle, Loader2, StopCircle, RefreshCw, ShieldCheck, 
    Layers, Calendar, ChevronRight, Info, Check, ListFilter
} from 'lucide-react';
import { buildBroadcastHtmlTemplate, sendCustomEmail } from '../../utils/email';
import { showToast, showConfirm, showAlert } from '../../utils/toast';

const STORAGE_KEY_LAST_BATCH = 'quizki_broadcast_last_batch';

const TEMPLATES = [
    {
        id: 'domain_upgrade',
        name: '🚀 Thông báo nâng cấp tên miền Quizki.space',
        subject: '🚀 [Thông báo] QuizKi chính thức nâng cấp sang tên miền mới: Quizki.space',
        bannerTitle: '🚀 QuizKi Nâng Cấp Tên Miền Mới!',
        bannerSubtitle: 'Trải nghiệm học tiếng Nhật mượt mà, tốc độ cao và ổn định hơn',
        bannerGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        greeting: 'Xin chào các bạn học viên QuizKi thân mến,',
        bodyText: `Để nâng cao chất lượng dịch vụ, tối ưu tốc độ máy chủ và phục vụ tốt hơn cho các tính năng mới trong lộ trình phát triển, đội ngũ QuizKi xin trân trọng thông báo ứng dụng đã chính thức chuyển sang tên miền quốc tế mới:\n\n🌐 Địa chỉ truy cập chính thức: https://quizki.space\n\n📌 Những lưu ý quan trọng dành cho bạn:\n• Dữ liệu học tập: Toàn bộ tiến độ, kho từ vựng và tài khoản của bạn được bảo toàn nguyên vẹn 100% trên đám mây.\n• Đăng nhập: Bạn chỉ cần truy cập link mới https://quizki.space và đăng nhập lại bằng tài khoản Google/Email như bình thường.\n• Nếu đã cài đặt App ra màn hình điện thoại (PWA): Vui lòng gỡ icon cũ và mở link mới để chọn "Thêm vào màn hình chính" lại nhé.`,
        buttonText: 'Truy cập QuizKi.space ngay →',
        buttonUrl: 'https://quizki.space',
        footerText: 'Chúc bạn có những giờ học tiếng Nhật thật nhiều cảm hứng và hiệu quả cùng QuizKi! 🌸'
    },
    {
        id: 'new_feature',
        name: '🌸 Giới thiệu tính năng / Bài học mới',
        subject: '🌸 [Cập nhật mới] QuizKi ra mắt tính năng học tập mới cực đỉnh',
        bannerTitle: '🌸 Cập Nhật Tính Năng Mới!',
        bannerSubtitle: 'Học tập thông minh và bứt phá điểm số cùng QuizKi AI',
        bannerGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        greeting: 'Chào bạn,',
        bodyText: `Đội ngũ phát triển QuizKi vừa phát hành bản cập nhật mới với nhiều cải tiến vượt bậc giúp việc ghi nhớ tiếng Nhật của bạn trở nên dễ dàng và thú vị hơn bao giờ hết.\n\nHãy truy cập app ngay để khám phá và trải nghiệm các tính năng mới nhất nhé!`,
        buttonText: 'Khám phá ngay →',
        buttonUrl: 'https://quizki.space',
        footerText: 'QuizKi - Luôn đồng hành cùng bạn trên con đường chinh phục JLPT.'
    },
    {
        id: 'promo_voucher',
        name: '🎁 Chương trình ưu đãi & Tặng Voucher',
        subject: '🎁 [Quà tặng đặc biệt] Nhận ưu đãi độc quyền từ QuizKi Premium',
        bannerTitle: '🎁 Ưu Đãi Đặc Quyền Dành Cho Bạn!',
        bannerSubtitle: 'Nâng cấp trải nghiệm học tập không giới hạn',
        bannerGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        greeting: 'Chào bạn thân mến,',
        bodyText: `QuizKi gửi tặng bạn chương trình ưu đãi đặc biệt để mở khóa toàn bộ kho dữ liệu Từ vựng Zen, Ngữ pháp chuyên sâu, Luyện Kanji và Không giới hạn tính năng AI giải thích ngữ cảnh.\n\nĐừng bỏ lỡ cơ hội bứt phá trình độ tiếng Nhật với mức học phí ưu đãi nhất!`,
        buttonText: 'Nhận ưu đãi ngay →',
        buttonUrl: 'https://quizki.space',
        footerText: 'Ưu đãi có hạn - Hãy kích hoạt ngay hôm nay bạn nhé!'
    },
    {
        id: 'maintenance',
        name: '⚠️ Thông báo lịch bảo trì hệ thống',
        subject: '⚠️ [Thông báo] Lịch bảo trì và nâng cấp hệ thống QuizKi',
        bannerTitle: '⚠️ Thông Báo Bảo Trì Hệ Thống',
        bannerSubtitle: 'Nâng cấp máy chủ định kỳ để phục vụ bạn tốt hơn',
        bannerGradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
        greeting: 'Kính gửi quý học viên QuizKi,',
        bodyText: `Hệ thống QuizKi sẽ tiến hành bảo trì và nâng cấp hạ tầng máy chủ định kỳ để tối ưu hóa hiệu năng.\n\nTrong thời gian bảo trì, ứng dụng có thể tạm thời gián đoạn trong ít phút. Rất mong các bạn thông cảm cho sự bất tiện này.`,
        buttonText: 'Kiểm tra trạng thái',
        buttonUrl: 'https://quizki.space',
        footerText: 'Cảm ơn sự thấu hiểu và đồng hành của bạn.'
    },
    {
        id: 'custom',
        name: '📝 Tự do soạn thảo (Tùy chỉnh)',
        subject: '',
        bannerTitle: 'Thông Báo Từ QuizKi',
        bannerSubtitle: '',
        bannerGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        greeting: 'Chào bạn,',
        bodyText: '',
        buttonText: 'Truy cập QuizKi',
        buttonUrl: 'https://quizki.space',
        footerText: 'Thân ái, Đội ngũ QuizKi.'
    }
];

const GRADIENT_PRESETS = [
    { label: 'Tím Indigo', value: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
    { label: 'Xanh Emerald', value: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
    { label: 'Cam Amber', value: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
    { label: 'Đỏ Ruby', value: 'linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)' },
    { label: 'Xanh Đen Slate', value: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' },
];

const DEFAULT_BATCH_SIZE = 80; // Khuyến nghị 80 mail/đợt để an toàn dưới giới hạn 100 mail/ngày của Resend Free

export default function AdminBroadcastEmailModal({ 
    isOpen, 
    onClose, 
    users = [], 
    getUserActivePlan,
    currentAdminEmail = '' 
}) {
    const [selectedTemplate, setSelectedTemplate] = useState('domain_upgrade');
    const [audience, setAudience] = useState('all'); // 'all' | 'premium' | 'free' | 'test'
    const [testEmail, setTestEmail] = useState(currentAdminEmail || '');
    
    // Batching Settings (Chia đợt gửi)
    const [enableBatching, setEnableBatching] = useState(true);
    const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
    const [customRange, setCustomRange] = useState({ start: 1, end: DEFAULT_BATCH_SIZE });
    const [showRecipientList, setShowRecipientList] = useState(false);
    const [lastSavedBatchInfo, setLastSavedBatchInfo] = useState(null);

    // Form fields
    const [subject, setSubject] = useState(TEMPLATES[0].subject);
    const [bannerTitle, setBannerTitle] = useState(TEMPLATES[0].bannerTitle);
    const [bannerSubtitle, setBannerSubtitle] = useState(TEMPLATES[0].bannerSubtitle);
    const [bannerGradient, setBannerGradient] = useState(TEMPLATES[0].bannerGradient);
    const [greeting, setGreeting] = useState(TEMPLATES[0].greeting);
    const [bodyText, setBodyText] = useState(TEMPLATES[0].bodyText);
    const [buttonText, setButtonText] = useState(TEMPLATES[0].buttonText);
    const [buttonUrl, setButtonUrl] = useState(TEMPLATES[0].buttonUrl);
    const [footerText, setFooterText] = useState(TEMPLATES[0].footerText);

    const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, success: 0, failed: 0, isDone: false });
    const [sendLogs, setSendLogs] = useState([]);
    
    const abortRef = useRef(false);

    // Load last sent batch info from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_LAST_BATCH);
            if (raw) {
                setLastSavedBatchInfo(JSON.parse(raw));
            }
        } catch (e) {
            console.error('Error reading broadcast history:', e);
        }
    }, [isOpen]);

    // Check user is Premium
    const checkIsPremium = (u) => {
        if (!u) return false;
        if (typeof getUserActivePlan === 'function') {
            return getUserActivePlan(u) !== 'free';
        }
        // Fallback check
        if (u.unlockedSpecializedPackages && Array.isArray(u.unlockedSpecializedPackages) && u.unlockedSpecializedPackages.length > 0) {
            return true;
        }
        if (u.isPremium === true || u.isPremiumUnlocked === true) return true;
        const p = u.activePlan || u.plan || u.package;
        return p && p !== 'free' && p !== 'basic';
    };

    // Filter valid email users
    const validUsers = useMemo(() => {
        return users.filter(u => u.email && typeof u.email === 'string' && u.email.includes('@'));
    }, [users]);

    // Audience lists & counts
    const audiencePool = useMemo(() => {
        const premiumUsers = validUsers.filter(checkIsPremium);
        const freeUsers = validUsers.filter(u => !checkIsPremium(u));

        return {
            all: validUsers,
            premium: premiumUsers,
            free: freeUsers,
            allCount: validUsers.length,
            premiumCount: premiumUsers.length,
            freeCount: freeUsers.length,
        };
    }, [validUsers, getUserActivePlan]);

    // Active audience array
    const activeAudienceList = useMemo(() => {
        if (audience === 'test') {
            const clean = testEmail?.trim();
            return clean ? [{ email: clean, name: 'Admin Test' }] : [];
        }
        if (audience === 'premium') return audiencePool.premium;
        if (audience === 'free') return audiencePool.free;
        return audiencePool.all;
    }, [audience, testEmail, audiencePool]);

    // Batches calculation
    const batches = useMemo(() => {
        if (audience === 'test' || activeAudienceList.length === 0) return [];
        const size = Math.max(1, Number(batchSize) || DEFAULT_BATCH_SIZE);
        const list = [];
        for (let i = 0; i < activeAudienceList.length; i += size) {
            const batchUsers = activeAudienceList.slice(i, i + size);
            list.push({
                batchIndex: list.length,
                batchNumber: list.length + 1,
                startNum: i + 1,
                endNum: Math.min(i + size, activeAudienceList.length),
                count: batchUsers.length,
                users: batchUsers
            });
        }
        return list;
    }, [activeAudienceList, batchSize, audience]);

    // Final Recipients to send in this run
    const targetRecipients = useMemo(() => {
        if (audience === 'test') return activeAudienceList;
        if (!enableBatching) return activeAudienceList;

        if (batches.length > 0 && selectedBatchIndex < batches.length) {
            return batches[selectedBatchIndex].users;
        }

        // Custom range fallback
        const start = Math.max(0, (customRange.start || 1) - 1);
        const end = Math.min(activeAudienceList.length, customRange.end || activeAudienceList.length);
        return activeAudienceList.slice(start, end);
    }, [audience, activeAudienceList, enableBatching, batches, selectedBatchIndex, customRange]);

    // Apply template change
    const handleTemplateChange = (templateId) => {
        setSelectedTemplate(templateId);
        const t = TEMPLATES.find(x => x.id === templateId);
        if (t) {
            setSubject(t.subject);
            setBannerTitle(t.bannerTitle);
            setBannerSubtitle(t.bannerSubtitle);
            setBannerGradient(t.bannerGradient);
            setGreeting(t.greeting);
            setBodyText(t.bodyText);
            setButtonText(t.buttonText);
            setButtonUrl(t.buttonUrl);
            setFooterText(t.footerText);
        }
    };

    // Rendered HTML string
    const renderedHtml = useMemo(() => {
        return buildBroadcastHtmlTemplate({
            bannerTitle,
            bannerSubtitle,
            bannerGradient,
            greeting,
            bodyText,
            buttonText,
            buttonUrl,
            footerText
        });
    }, [bannerTitle, bannerSubtitle, bannerGradient, greeting, bodyText, buttonText, buttonUrl, footerText]);

    // Handle Send Action
    const handleStartBroadcast = async () => {
        if (!subject.trim()) {
            showToast('Vui lòng nhập Tiêu đề email!', 'warning');
            return;
        }

        if (targetRecipients.length === 0) {
            showToast('Không tìm thấy người nhận nào phù hợp!', 'warning');
            return;
        }

        const currentBatchInfo = enableBatching && batches[selectedBatchIndex] 
            ? ` (Đợt ${batches[selectedBatchIndex].batchNumber}: #${batches[selectedBatchIndex].startNum} - #${batches[selectedBatchIndex].endNum})`
            : '';

        const confirmMsg = audience === 'test'
            ? `Gửi email thử nghiệm tới: ${testEmail}?`
            : `Bạn có chắc chắn muốn gửi email này tới ${targetRecipients.length} học viên${currentBatchInfo} không?`;

        const confirmed = await showConfirm(confirmMsg, {
            confirmText: 'Bắt đầu gửi',
            cancelText: 'Hủy',
            type: 'warning'
        });

        if (!confirmed) return;

        setSending(true);
        abortRef.current = false;
        setSendProgress({ current: 0, total: targetRecipients.length, success: 0, failed: 0, isDone: false });
        setSendLogs([]);

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < targetRecipients.length; i++) {
            if (abortRef.current) {
                setSendLogs(prev => [...prev, `⛔ Đã dừng chiến dịch gửi email theo yêu cầu.`]);
                break;
            }

            const recipient = targetRecipients[i];
            const email = recipient.email;

            try {
                const ok = await sendCustomEmail(email, subject, renderedHtml);
                if (ok) {
                    successCount++;
                    setSendLogs(prev => [...prev.slice(-30), `✅ [${i + 1}/${targetRecipients.length}] Thành công: ${email}`]);
                } else {
                    failedCount++;
                    setSendLogs(prev => [...prev.slice(-30), `❌ [${i + 1}/${targetRecipients.length}] Thất bại: ${email}`]);
                }
            } catch (err) {
                failedCount++;
                setSendLogs(prev => [...prev.slice(-30), `❌ [${i + 1}/${targetRecipients.length}] Lỗi (${email}): ${err.message}`]);
            }

            setSendProgress({
                current: i + 1,
                total: targetRecipients.length,
                success: successCount,
                failed: failedCount,
                isDone: i + 1 === targetRecipients.length
            });

            // Delay 250ms giữa các email
            await new Promise(r => setTimeout(r, 250));
        }

        // Save progress to localStorage if batching was used
        if (enableBatching && batches[selectedBatchIndex] && audience !== 'test') {
            const batchData = {
                date: new Date().toISOString(),
                batchNumber: batches[selectedBatchIndex].batchNumber,
                endNum: batches[selectedBatchIndex].endNum,
                totalUsers: activeAudienceList.length,
                audience: audience,
                successCount
            };
            localStorage.setItem(STORAGE_KEY_LAST_BATCH, JSON.stringify(batchData));
            setLastSavedBatchInfo(batchData);
        }

        setSending(false);

        if (!abortRef.current) {
            showAlert(`Gửi email hoàn tất!\nĐã gửi thành công: ${successCount}/${targetRecipients.length} email.`, {
                title: 'Chiến Dịch Hoàn Tất',
                type: 'success'
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Soạn & Gửi Email Hàng Loạt (Broadcast)
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Gửi thông báo chính thức tới học viên QuizKi qua Resend (@quizki.space)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tab Switcher */}
                        <div className="flex items-center bg-gray-200 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
                            <button
                                onClick={() => setActiveTab('edit')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'edit'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Soạn thảo
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'preview'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                                }`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Xem trước
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            disabled={sending}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'edit' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Left Settings Column */}
                            <div className="lg:col-span-5 space-y-4">
                                
                                {/* Template Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        Mẫu email có sẵn
                                    </label>
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => handleTemplateChange(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {TEMPLATES.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Audience Selector with Exact Breakdown */}
                                <div className="p-4 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-200/80 dark:border-gray-700/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                            Đối tượng nhận ({activeAudienceList.length} người)
                                        </label>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                            Tổng: <strong>{audiencePool.allCount}</strong> email
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => { setAudience('all'); setSelectedBatchIndex(0); }}
                                            className={`p-2.5 rounded-lg border font-semibold text-left transition-all ${
                                                audience === 'all'
                                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            👥 Tất cả ({audiencePool.allCount})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => { setAudience('premium'); setSelectedBatchIndex(0); }}
                                            className={`p-2.5 rounded-lg border font-semibold text-left transition-all ${
                                                audience === 'premium'
                                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            💎 Premium ({audiencePool.premiumCount})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => { setAudience('free'); setSelectedBatchIndex(0); }}
                                            className={`p-2.5 rounded-lg border font-semibold text-left transition-all ${
                                                audience === 'free'
                                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            🌱 Free ({audiencePool.freeCount})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAudience('test')}
                                            className={`p-2.5 rounded-lg border font-semibold text-left transition-all ${
                                                audience === 'test'
                                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            🧪 Gửi thử nghiệm
                                        </button>
                                    </div>

                                    {audience === 'test' && (
                                        <div className="pt-2">
                                            <input
                                                type="email"
                                                placeholder="Nhập email nhận thử nghiệm..."
                                                value={testEmail}
                                                onChange={(e) => setTestEmail(e.target.value)}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* BATCHING / CHIA ĐỢT GỬI (Resend Free Limit: 100/day) */}
                                {audience !== 'test' && (
                                    <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                Chia đợt gửi (Hạn mức 100 mail/ngày)
                                            </div>

                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={enableBatching} 
                                                    onChange={(e) => setEnableBatching(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-600"></div>
                                            </label>
                                        </div>

                                        {enableBatching ? (
                                            <div className="space-y-3">
                                                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                                    Resend Free cho phép tối đa <strong>100 mail/ngày</strong>. Hệ thống tự động chia danh sách thành các đợt <strong>{batchSize} email/ngày</strong> để bạn gửi an toàn trong nhiều ngày.
                                                </p>

                                                {/* History notice */}
                                                {lastSavedBatchInfo && (
                                                    <div className="p-2.5 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-amber-200 dark:border-amber-900/60 text-[11px] text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <span>Lần gần nhất: Đã gửi <strong>Đợt {lastSavedBatchInfo.batchNumber}</strong> (đến học viên #{lastSavedBatchInfo.endNum}) vào {new Date(lastSavedBatchInfo.date).toLocaleDateString('vi-VN')}.</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Batch Selector Buttons */}
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300">
                                                        Chọn đợt muốn gửi hôm nay:
                                                    </label>
                                                    
                                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                        {batches.map((b, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setSelectedBatchIndex(idx)}
                                                                className={`w-full p-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                                                                    selectedBatchIndex === idx
                                                                        ? 'border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 shadow-sm'
                                                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50/50'
                                                                }`}
                                                            >
                                                                <span className="flex items-center gap-1.5">
                                                                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                                                    Đợt {b.batchNumber}: Học viên #{b.startNum} → #{b.endNum}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-800/60 text-[10px] font-bold">
                                                                    {b.count} email
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Toggle recipient list preview */}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRecipientList(!showRecipientList)}
                                                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                                >
                                                    <ListFilter className="w-3 h-3" />
                                                    {showRecipientList ? 'Ẩn danh sách người nhận' : `Xem danh sách ${targetRecipients.length} email đợt này`}
                                                </button>

                                                {showRecipientList && (
                                                    <div className="max-h-28 overflow-y-auto p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
                                                        {targetRecipients.map((u, i) => (
                                                            <div key={i} className="truncate">
                                                                #{((batches[selectedBatchIndex]?.startNum || 1) + i)}: {u.email}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-gray-500 italic">
                                                (Đang gửi toàn bộ {activeAudienceList.length} email trong một lần - Lưu ý giới hạn 100 mail/ngày của Resend).
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Banner Style Picker */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        Màu sắc Banner
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {GRADIENT_PRESETS.map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setBannerGradient(p.value)}
                                                style={{ background: p.value }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-transform ${
                                                    bannerGradient === p.value ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Button (CTA) Settings */}
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                            Chữ trên nút bấm (CTA)
                                        </label>
                                        <input
                                            type="text"
                                            value={buttonText}
                                            onChange={(e) => setButtonText(e.target.value)}
                                            placeholder="Ví dụ: Truy cập QuizKi.space ngay →"
                                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                            Đường link nút bấm (URL)
                                        </label>
                                        <input
                                            type="url"
                                            value={buttonUrl}
                                            onChange={(e) => setButtonUrl(e.target.value)}
                                            placeholder="https://quizki.space"
                                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Editor Column */}
                            <div className="lg:col-span-7 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                                        Tiêu đề Email (Subject) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Ví dụ: 🚀 [Thông báo] QuizKi chính thức nâng cấp sang tên miền mới..."
                                        className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                            Tiêu đề lớn trên Banner
                                        </label>
                                        <input
                                            type="text"
                                            value={bannerTitle}
                                            onChange={(e) => setBannerTitle(e.target.value)}
                                            placeholder="🚀 QuizKi Nâng Cấp..."
                                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                            Phụ đề trên Banner
                                        </label>
                                        <input
                                            type="text"
                                            value={bannerSubtitle}
                                            onChange={(e) => setBannerSubtitle(e.target.value)}
                                            placeholder="Trải nghiệm học mượt mà..."
                                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Lời chào mở đầu
                                    </label>
                                    <input
                                        type="text"
                                        value={greeting}
                                        onChange={(e) => setGreeting(e.target.value)}
                                        placeholder="Xin chào các bạn học viên QuizKi thân mến,"
                                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Nội dung thông báo (Hỗ trợ xuống dòng phân đoạn)
                                    </label>
                                    <textarea
                                        rows={8}
                                        value={bodyText}
                                        onChange={(e) => setBodyText(e.target.value)}
                                        placeholder="Nhập nội dung thông điệp bạn muốn gửi..."
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Lời kết Footer
                                    </label>
                                    <input
                                        type="text"
                                        value={footerText}
                                        onChange={(e) => setFooterText(e.target.value)}
                                        placeholder="Chúc bạn học tốt..."
                                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Live Preview Tab */
                        <div className="max-w-2xl mx-auto">
                            <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                                <span>📧 Tiêu đề hiển thị: <strong className="text-gray-800 dark:text-white">{subject || '(Chưa có tiêu đề)'}</strong></span>
                                <span>Người gửi: <strong>noreply@quizki.space</strong></span>
                            </div>
                            <div 
                                className="border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden bg-white"
                                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            />
                        </div>
                    )}

                    {/* Sending Progress & Logs View */}
                    {(sending || sendProgress.total > 0) && (
                        <div className="mt-6 p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    )}
                                    <span className="font-bold text-sm">
                                        {sending ? 'Đang tiến hành gửi email...' : 'Đã hoàn tất gửi email!'}
                                    </span>
                                </div>

                                <span className="text-xs font-mono text-slate-300">
                                    {sendProgress.current} / {sendProgress.total} ({Math.round((sendProgress.current / (sendProgress.total || 1)) * 100)}%)
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                                    style={{ width: `${Math.round((sendProgress.current / (sendProgress.total || 1)) * 100)}%` }}
                                />
                            </div>

                            <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="text-emerald-400">✅ Thành công: {sendProgress.success}</span>
                                <span className="text-red-400">❌ Thất bại: {sendProgress.failed}</span>
                            </div>

                            {/* Live Logs Terminal */}
                            <div className="max-h-32 overflow-y-auto bg-black/40 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1">
                                {sendLogs.map((log, idx) => (
                                    <div key={idx}>{log}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Sử dụng Resend API qua Cloudflare Worker</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {sending && (
                            <button
                                type="button"
                                onClick={() => { abortRef.current = true; }}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <StopCircle className="w-4 h-4" />
                                Dừng gửi
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleStartBroadcast}
                            disabled={sending || targetRecipients.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang gửi ({sendProgress.current}/{sendProgress.total})...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    {audience === 'test' 
                                        ? 'Gửi thử nghiệm' 
                                        : enableBatching && batches[selectedBatchIndex]
                                            ? `Gửi Đợt ${batches[selectedBatchIndex].batchNumber} (${targetRecipients.length} email)`
                                            : `Gửi tới ${targetRecipients.length} người nhận`
                                    }
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
