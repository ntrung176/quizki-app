import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, Flame, Trophy, Volume2, CheckCircle2,
    BookOpen, MessageSquare, Brain, Compass, Gem, Globe, Check, ShieldCheck
} from 'lucide-react';
import { FlagIcon } from '../ui/FlagIcon';
import QuizKiLogo from '../ui/QuizKiLogo';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';

const LandingScreen = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();
    const { targetLanguage, setTargetLanguage } = useTargetLanguage();
    const [audioPlaying, setAudioPlaying] = useState(false);

    const handlePlayDemoAudio = () => {
        setAudioPlaying(true);
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance('猫、ねこ');
            utterance.lang = 'ja-JP';
            utterance.rate = 0.9;
            utterance.onend = () => setAudioPlaying(false);
            utterance.onerror = () => setAudioPlaying(false);
            window.speechSynthesis.speak(utterance);
        } else {
            setTimeout(() => setAudioPlaying(false), 1200);
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-700 relative overflow-x-hidden">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 transition-colors">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Brand Logo */}
                    <div className="cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <QuizKiLogo size="md" showSubtitle={true} subtitleText="LEARNING PLATFORM" />
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Target Language Toggle */}
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
                            {[
                                { id: 'ja', code: 'jp', label: '日本語' },
                                { id: 'en', code: 'gb', label: 'English' },
                                { id: 'ko', code: 'kr', label: '한국어' }
                            ].map((lang) => (
                                <button
                                    key={lang.id}
                                    onClick={() => setTargetLanguage(lang.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                        targetLanguage === lang.id
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <FlagIcon countryCode={lang.code} className="w-3.5 h-2.5 rounded-xs object-cover" />
                                    <span>{lang.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* UI Language Switcher */}
                        <button
                            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all"
                            title="Switch Language"
                        >
                            <Globe className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{language === 'vi' ? 'VI' : 'EN'}</span>
                        </button>

                        {/* Login Button */}
                        <button
                            onClick={() => navigate(ROUTES.LOGIN)}
                            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-all"
                        >
                            {t('landing.signIn', 'Đăng nhập')}
                        </button>

                        {/* Duolingo-styled 3D Get Started Button */}
                        <button
                            onClick={() => navigate(ROUTES.ONBOARDING)}
                            className="inline-flex items-center justify-center px-4 sm:px-5 py-2 text-xs sm:text-sm font-black text-white bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 rounded-xl shadow-xs transition-all tracking-wide uppercase"
                        >
                            {t('landing.exploreFree', 'Bắt đầu')}
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    {/* Hero Graphic / Interactive Card (Left / Top on mobile) */}
                    <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
                        <div className="relative w-full max-w-sm sm:max-w-md">
                            {/* Decorative background glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 rounded-3xl blur-2xl transform -rotate-3 scale-95 pointer-events-none" />

                            {/* Main Interactive Card */}
                            <div className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                                {/* Card Top Badges */}
                                <div className="flex items-center justify-between mb-6">
                                    <span className="px-3 py-1 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 text-xs font-bold rounded-xl border border-cyan-200 dark:border-cyan-800 flex items-center gap-1.5">
                                        <Gem className="w-3.5 h-3.5 text-cyan-500 fill-cyan-400/20" />
                                        Thuộc vĩnh viễn (SRS Stage 5)
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-400">
                                        JLPT N5
                                    </span>
                                </div>

                                {/* Main Kanji / Word presentation */}
                                <div className="text-center py-4">
                                    <div className="text-6xl sm:text-7xl font-japanese font-black text-slate-900 dark:text-white tracking-tight mb-2 select-none">
                                        猫
                                    </div>
                                    <div className="text-lg font-bold text-slate-500 dark:text-slate-400 font-japanese">
                                        ねこ • neko
                                    </div>
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                                        Con mèo
                                    </div>
                                </div>

                                {/* Audio & Pitch accent simulation bar */}
                                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                    <button
                                        onClick={handlePlayDemoAudio}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            audioPlaying
                                                ? 'bg-emerald-500 text-white animate-pulse'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <Volume2 className="w-4 h-4" />
                                        <span>{audioPlaying ? 'Đang phát...' : 'Nghe giọng bản xứ'}</span>
                                    </button>

                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                                        <Flame className="w-4 h-4 fill-current" />
                                        <span>+15 XP</span>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Habit Mascot Pill */}
                            <div className="absolute -bottom-5 -right-3 sm:-right-5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 dark:border-slate-200 animate-bounce duration-1000">
                                <span className="text-2xl">🔥</span>
                                <div className="text-left">
                                    <div className="text-xs font-black leading-tight">Chuỗi 14 ngày!</div>
                                    <div className="text-[10px] opacity-75 font-medium leading-none">Duy trì trí nhớ bền vững</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hero Text & CTA (Right / Bottom on mobile) */}
                    <div className="lg:col-span-7 space-y-6 text-center lg:text-left order-1 lg:order-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {t('landing.heroBadge', 'NỀN TẢNG NGOẠI NGỮ THẾ HỆ MỚI')}
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                            {t('landing.heroTitle', 'Cách học ngoại ngữ thông minh, vui nhộn & nhớ sâu trọn đời.')}
                        </h1>

                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium max-w-2xl leading-relaxed">
                            {t('landing.heroSub', 'Kết hợp thuật toán Spaced Repetition (SRS) khoa học, gia sư AI Kaiwa thông minh và toàn bộ giáo trình chuẩn hóa từ N5 đến N1.')}
                        </p>

                        {/* CTA Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5 justify-center lg:justify-start">
                            <button
                                onClick={() => navigate(ROUTES.ONBOARDING)}
                                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 active:translate-y-1 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-emerald-500/25 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <span>{t('landing.getStarted', 'BẮT ĐẦU NGAY (MIỄN PHÍ)')}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => navigate(ROUTES.LOGIN)}
                                className="w-full sm:w-auto px-8 py-3.5 border-2 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black text-base rounded-2xl transition-all uppercase tracking-wider"
                            >
                                {t('landing.haveAccount', 'TÔI ĐÃ CÓ TÀI KHOẢN')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* LANGUAGE RIBBON */}
            <div className="border-y border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-4 px-4 overflow-x-auto scrollbar-none">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 min-w-max text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                        <FlagIcon countryCode="jp" className="w-5 h-3.5 rounded-xs object-cover" />
                        <span>{t('landing.langRibbonJa', 'Tiếng Nhật (N5 - N1)')}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                        <FlagIcon countryCode="gb" className="w-5 h-3.5 rounded-xs object-cover" />
                        <span>{t('landing.langRibbonEn', 'Tiếng Anh (IELTS / TOEIC)')}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                        <FlagIcon countryCode="kr" className="w-5 h-3.5 rounded-xs object-cover" />
                        <span>{t('landing.langRibbonKo', 'Tiếng Hàn (TOPIK)')}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-japanese font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">漢</span>
                        <span>{t('landing.langRibbonKanji', '2,136 Hán Tự Kanji')}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-sky-500 stroke-[2.5]" />
                        <span>{t('landing.langRibbonKaiwa', 'Gia sư AI Kaiwa 24/7')}</span>
                    </div>
                </div>
            </div>

            {/* ALTERNATING SHOWCASE SECTIONS (Duolingo Style) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24 space-y-24 sm:space-y-36">
                {/* 1. Spaced Repetition (SRS) Showcase */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-6 space-y-5">
                        <span className="text-xs font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            {t('landing.feature1Tag', 'KHOA HỌC TRÍ NHỚ')}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            {t('landing.feature1Title', 'Ghi nhớ bền vững với Spaced Repetition (SRS)')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
                            {t('landing.feature1Sub', 'Đừng lãng phí thời gian học vẹt rồi quên sạch. Thuật toán SRS tự động phân tích đường cong quên lãng, nhắc lại từ vựng đúng thời điểm vàng bạn sắp quên — giúp bạn nhớ trọn đời chỉ với 10 phút mỗi ngày.')}
                        </p>
                        <ul className="space-y-3 pt-2">
                            {[
                                t('landing.feature1Bullet1', 'Giảm 80% thời gian ôn luyện lặp lại'),
                                t('landing.feature1Bullet2', 'Tự động phân bổ khoảng cách theo độ khó'),
                                t('landing.feature1Bullet3', 'Hỗ trợ phát âm bản xứ & cao độ Pitch Accent')
                            ].map((bullet, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-6 flex justify-center">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                Lộ trình lặp lại ngắt quãng khoa học
                            </div>
                            <div className="space-y-3">
                                {[
                                    { stage: 'Stage 1', time: 'Sau 4 giờ', title: 'Tiếp nhận mới', color: 'bg-rose-500' },
                                    { stage: 'Stage 2', time: 'Sau 1 ngày', title: 'Ghi nhớ sơ cấp', color: 'bg-amber-500' },
                                    { stage: 'Stage 3', time: 'Sau 3 ngày', title: 'Củng cố trí nhớ', color: 'bg-sky-500' },
                                    { stage: 'Stage 4', time: 'Sau 1 tuần', title: 'Ghi nhớ sâu', color: 'bg-emerald-500' },
                                    { stage: 'Stage 5', time: 'Vĩnh viễn', title: 'Thuộc vĩnh viễn (Mastered)', color: 'bg-emerald-500' }
                                ].map((step, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${step.color}`} />
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">{step.title}</span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-400">{step.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. AI Kaiwa Showcase */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-6 flex justify-center order-2 lg:order-1">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                                        AI
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">Sensei Sakura (AI Tutor)</div>
                                        <div className="text-[10px] text-emerald-500 font-bold">● Đang trực tuyến</div>
                                    </div>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                    Kaiwa Room
                                </span>
                            </div>

                            {/* Dialogue bubble */}
                            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 font-japanese">
                                こんにちは！今日の調子はどうですか？日本語で少し話してみましょう。
                            </div>

                            {/* User Voice response simulation */}
                            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 font-japanese flex items-center justify-between">
                                <span>とても元気です！今日勉強を頑張ります。</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                            </div>

                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                <span>Phát âm: <strong className="text-emerald-600">Chuẩn 98%</strong></span>
                                <span>Cao độ: <strong className="text-emerald-600">Tự nhiên</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
                        <span className="text-xs font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            {t('landing.feature2Tag', 'GIA SƯ AI KAIWA')}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            {t('landing.feature2Title', 'Tự tin giao tiếp và phản xạ không ngại ngùng')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
                            {t('landing.feature2Sub', 'Không còn nỗi sợ nói sai trước người lạ. Gia sư AI lắng nghe giọng nói của bạn, nhận diện phát âm, sửa lỗi dùng từ và gợi ý cách diễn đạt tự nhiên như người bản xứ.')}
                        </p>
                        <ul className="space-y-3 pt-2">
                            {[
                                t('landing.feature2Bullet1', 'Đàm thoại giọng nói thời gian thực với AI'),
                                t('landing.feature2Bullet2', 'Phân tích chính xác cao độ âm điệu (Pitch Accent)'),
                                t('landing.feature2Bullet3', 'Mô phỏng hàng trăm tình huống thực tế đời sống')
                            ].map((bullet, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* 3. Curriculum Showcase */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-6 space-y-5">
                        <span className="text-xs font-black tracking-widest uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                            {t('landing.feature3Tag', 'LỘ TRÌNH BÀI BẢN')}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            {t('landing.feature3Title', 'Trọn bộ Từ vựng, Hán tự Kanji & Ngữ pháp N5–N1')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
                            {t('landing.feature3Sub', 'Mọi thứ bạn cần cho kỳ thi JLPT được gói gọn trong một nơi: hơn 2,000 chữ Kanji kèm bộ thủ, ví dụ minh họa và kho giáo trình tương tác chuẩn mực (Minna no Nihongo, Soumatome).')}
                        </p>
                        <ul className="space-y-3 pt-2">
                            {[
                                t('landing.feature3Bullet1', 'Hơn 2,000 chữ Hán tự Kanji phân cấp chi tiết'),
                                t('landing.feature3Bullet2', 'Giáo trình Minna no Nihongo & Soumatome'),
                                t('landing.feature3Bullet3', 'Đề thi thử bấm giờ sát với cấu trúc đề thật')
                            ].map((bullet, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                                    <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center shrink-0">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-6 flex justify-center">
                        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-center shadow-md">
                                <span className="text-4xl font-japanese font-black text-amber-500">夢</span>
                                <div className="text-xs font-bold text-slate-400 mt-1">MỘNG</div>
                                <div className="text-sm font-black text-slate-900 dark:text-white mt-1">Giấc mơ</div>
                                <div className="text-[10px] text-emerald-500 font-bold mt-2">N3 • 13 nét</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-center shadow-md">
                                <span className="text-4xl font-japanese font-black text-rose-500">道</span>
                                <div className="text-xs font-bold text-slate-400 mt-1">ĐẠO</div>
                                <div className="text-sm font-black text-slate-900 dark:text-white mt-1">Con đường</div>
                                <div className="text-[10px] text-emerald-500 font-bold mt-2">N5 • 12 nét</div>
                            </div>
                            <div className="col-span-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold uppercase opacity-80">Giáo trình chuẩn</div>
                                    <div className="text-base font-black">Minna no Nihongo & Soumatome</div>
                                </div>
                                <BookOpen className="w-8 h-8 opacity-90" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Gamified Habit Loop Showcase */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-6 flex justify-center order-2 lg:order-1">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Flame className="w-6 h-6 text-amber-500 fill-current animate-pulse" />
                                    <span className="font-black text-lg text-slate-900 dark:text-white">Streak 29 Ngày</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl">
                                    Đang bùng cháy 🔥
                                </span>
                            </div>

                            <div className="space-y-2.5 pt-2">
                                <div className="text-xs font-bold text-slate-400 uppercase">Nhiệm vụ hàng ngày</div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                                    <span className="text-xs font-bold">Ôn tập 20 thẻ SRS</span>
                                    <span className="text-xs font-black text-emerald-500">20/20 ✅</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                                    <span className="text-xs font-bold">Luyện 1 bài Kanji</span>
                                    <span className="text-xs font-black text-amber-500">1/1 ✅</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                                    <span className="text-xs font-bold">3 phút đàm thoại AI</span>
                                    <span className="text-xs font-black text-emerald-500">Hoàn thành +40 XP</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
                        <span className="text-xs font-black tracking-widest uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                            {t('landing.feature4Tag', 'THÓI QUEN MỖI NGÀY')}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            {t('landing.feature4Title', 'Duy trì cảm hứng và động lực như một trò chơi')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
                            {t('landing.feature4Sub', 'QuizKi biến việc học ngoại ngữ trở thành thói quen say mê. Giữ lửa chuỗi ngày học Streak rực cháy, hoàn thành nhiệm vụ và tích lũy điểm kinh nghiệm XP mỗi ngày.')}
                        </p>
                        <ul className="space-y-3 pt-2">
                            {[
                                t('landing.feature4Bullet1', 'Chuỗi ngày Streak tiếp lửa động lực liên tục'),
                                t('landing.feature4Bullet2', 'Nhiệm vụ vi mô hàng ngày không gây áp lực'),
                                t('landing.feature4Bullet3', 'Tích lũy XP, mở khóa danh hiệu & bảng vàng')
                            ].map((bullet, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                                    <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* CALL TO ACTION BOTTOM BANNER */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
                <div className="relative bg-slate-900 dark:bg-slate-900 border-2 border-slate-800 text-white rounded-3xl p-8 sm:p-14 text-center overflow-hidden shadow-2xl">
                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                            {t('landing.ctaBannerTitle', 'Sẵn sàng nâng tầm ngoại ngữ của bạn?')}
                        </h2>
                        <p className="text-slate-300 text-base sm:text-lg font-medium">
                            {t('landing.ctaBannerSub', 'Tham gia cùng hàng ngàn học viên đang bứt phá từ vựng và phản xạ mỗi ngày cùng QuizKi.')}
                        </p>
                        <div className="pt-2">
                            <button
                                onClick={() => navigate(ROUTES.ONBOARDING)}
                                className="px-8 sm:px-10 py-4 bg-emerald-500 hover:bg-emerald-400 active:translate-y-1 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl transition-all uppercase tracking-wider inline-flex items-center gap-3"
                            >
                                <span>{t('landing.ctaBannerButton', 'BẮT ĐẦU NGAY — MIỄN PHÍ TRỌN ĐỜI')}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-8 bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        {t('landing.footerCopyright', '© 2026 QuizKi AI. Nền tảng học ngoại ngữ thông minh.')}
                    </div>
                    <div className="flex items-center gap-6 font-bold">
                        <button onClick={() => navigate(ROUTES.TERMS)} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                            {t('landing.footerTerms', 'Điều khoản dịch vụ')}
                        </button>
                        <button onClick={() => navigate(ROUTES.PRIVACY)} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                            {t('landing.footerPrivacy', 'Chính sách quyền riêng tư')}
                        </button>
                        <button onClick={() => navigate(ROUTES.HELP)} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                            {t('landing.footerHelp', 'Trợ giúp & Hỗ trợ')}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingScreen;

