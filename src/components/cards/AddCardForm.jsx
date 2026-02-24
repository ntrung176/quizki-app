import React, { useState, useEffect, useRef } from 'react';
import { Plus, Wand2, Loader2, Image as ImageIcon, Check, X, Copy, FileJson, PenTool, ClipboardCheck, Search, BookOpen, Languages, MessageSquare, Tag, Sparkles, ChevronDown } from 'lucide-react';
import { JLPT_LEVELS, POS_TYPES } from '../../config/constants';
import { compressImage } from '../../utils/image';
import OnboardingTour from '../ui/OnboardingTour';
import ImageSearchModal from '../ui/ImageSearchModal';

const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

const SAMPLE_JSON = `[
  {
    "front": "食べる（たべる）",
    "back": "Ăn",
    "sinoVietnamese": "Thực",
    "synonym": "食事する",
    "example": "私は毎日ご飯を食べる。",
    "exampleMeaning": "Tôi ăn cơm mỗi ngày.",
    "nuance": "Động từ phổ biến nhất để chỉ hành động ăn",
    "pos": "verb",
    "level": "N5"
  },
  {
    "front": "飲む（のむ）",
    "back": "Uống",
    "sinoVietnamese": "Ẩm",
    "synonym": "",
    "example": "水を飲む。",
    "exampleMeaning": "Uống nước.",
    "nuance": "",
    "pos": "verb",
    "level": "N5"
  }
]`;

// Reusable floating label input component
const FloatingInput = ({ id, label, value, onChange, required, placeholder, icon: Icon, inputRef, onKeyDown, onFocus, className = '', type = 'text', ...props }) => {
    const hasValue = value && value.length > 0;
    return (
        <div className={`relative group ${className}`}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors z-10">
                {Icon && <Icon className="w-4 h-4" />}
            </div>
            <input
                id={id}
                ref={inputRef}
                type={type}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                required={required}
                placeholder=" "
                className={`peer w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 pt-5 pb-2 bg-white dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/10 transition-all text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-transparent outline-none`}
                {...props}
            />
            <label
                htmlFor={id}
                className={`absolute ${Icon ? 'left-10' : 'left-4'} text-gray-400 dark:text-gray-500 transition-all duration-200 pointer-events-none
                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
                    peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-indigo-500 dark:peer-focus:text-indigo-400 peer-focus:font-semibold peer-focus:translate-y-0
                    ${hasValue ? 'top-1.5 text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold translate-y-0' : ''}`}
            >
                {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            {placeholder && hasValue && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300 dark:text-gray-600 hidden md:block">{placeholder}</span>
            )}
        </div>
    );
};

// Floating label textarea
const FloatingTextarea = ({ id, label, value, onChange, rows = 2, icon: Icon, placeholder, className = '' }) => {
    const hasValue = value && value.length > 0;
    return (
        <div className={`relative group ${className}`}>
            <div className="absolute left-3 top-4 pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors z-10">
                {Icon && <Icon className="w-4 h-4" />}
            </div>
            <textarea
                id={id}
                value={value}
                onChange={onChange}
                rows={rows}
                placeholder=" "
                className={`peer w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 pt-5 pb-2 bg-white dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/10 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-transparent outline-none resize-none`}
            />
            <label
                htmlFor={id}
                className={`absolute ${Icon ? 'left-10' : 'left-4'} text-gray-400 dark:text-gray-500 transition-all duration-200 pointer-events-none
                    peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
                    peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-indigo-500 dark:peer-focus:text-indigo-400 peer-focus:font-semibold
                    ${hasValue ? 'top-1.5 text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold' : ''}`}
            >
                {label}
            </label>
        </div>
    );
};

const AddCardForm = ({
    onSave,
    onBack,
    onGeminiAssist,
    batchMode = false,
    currentBatchIndex = 0,
    totalBatchCount = 0,
    onBatchNext,
    onBatchSkip,
    editingCard: initialEditingCard = null,
    onOpenBatchImport
}) => {
    const [activeTab, setActiveTab] = useState('json');
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [synonym, setSynonym] = useState('');
    const [example, setExample] = useState('');
    const [exampleMeaning, setExampleMeaning] = useState('');
    const [nuance, setNuance] = useState('');
    const [pos, setPos] = useState('');
    const [level, setLevel] = useState('');
    const [sinoVietnamese, setSinoVietnamese] = useState('');
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const frontInputRef = useRef(null);

    // JSON state
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState('');
    const [jsonParsed, setJsonParsed] = useState(null);
    const [jsonImporting, setJsonImporting] = useState(false);
    const [jsonImportResult, setJsonImportResult] = useState(null);
    const [copiedSample, setCopiedSample] = useState(false);
    const [showImageSearch, setShowImageSearch] = useState(false);

    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [availableFolders, setAvailableFolders] = useState([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('vocab_folders');
            if (saved) setAvailableFolders(JSON.parse(saved));
        } catch (e) { console.error('Error loading folders:', e); }
    }, []);

    useEffect(() => {
        if (initialEditingCard) {
            setFront(initialEditingCard.front || '');
            setBack(initialEditingCard.back || '');
            setSynonym(initialEditingCard.synonym || '');
            setExample(initialEditingCard.example || '');
            setExampleMeaning(initialEditingCard.exampleMeaning || '');
            setNuance(initialEditingCard.nuance || '');
            setPos(initialEditingCard.pos || '');
            setLevel(initialEditingCard.level || '');
            setSinoVietnamese(initialEditingCard.sinoVietnamese || '');
            setSynonymSinoVietnamese(initialEditingCard.synonymSinoVietnamese || '');
            setImagePreview(initialEditingCard.imageBase64 || null);
        }
    }, [initialEditingCard]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                setImagePreview(compressedBase64);
            } catch (error) {
                console.error("Lỗi nén ảnh:", error);
                alert("Không thể xử lý ảnh này.");
            }
        }
    };

    const handleRemoveImage = () => { setImagePreview(null); };

    const handleSave = async (action) => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true);
        const success = await onSave({
            front, back, synonym, example, exampleMeaning, nuance, pos, level,
            sinoVietnamese, synonymSinoVietnamese, action,
            imageBase64: imagePreview, audioBase64: null,
            folderId: selectedFolderId || null
        });
        setIsSaving(false);
        if (success && action === 'continue') {
            setFront(''); setBack(''); setSynonym(''); setExample(''); setExampleMeaning('');
            setNuance(''); setPos(''); setLevel(''); setSinoVietnamese(''); setSynonymSinoVietnamese('');
            setImagePreview(null);
            if (frontInputRef.current && !isMobileDevice()) frontInputRef.current.focus();
        }
    };

    const handleAiAssist = async (e) => {
        e.preventDefault();
        if (!front.trim()) {
            if (frontInputRef.current && !isMobileDevice()) frontInputRef.current.focus();
            return;
        }
        setIsAiLoading(true);
        const aiData = await onGeminiAssist(front, pos, level);
        if (aiData) {
            if (aiData.frontWithFurigana) setFront(aiData.frontWithFurigana);
            if (aiData.meaning) setBack(aiData.meaning);
            if (aiData.sinoVietnamese) setSinoVietnamese(aiData.sinoVietnamese);
            if (aiData.synonym) setSynonym(aiData.synonym);
            if (aiData.synonymSinoVietnamese) setSynonymSinoVietnamese(aiData.synonymSinoVietnamese);
            if (aiData.example) setExample(aiData.example);
            if (aiData.exampleMeaning) setExampleMeaning(aiData.exampleMeaning);
            if (aiData.nuance) setNuance(aiData.nuance);
            if (aiData.pos) setPos(aiData.pos);
            if (aiData.level) setLevel(aiData.level);
        }
        setIsAiLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'g' && (e.altKey || e.metaKey)) {
            e.preventDefault();
            handleAiAssist(e);
        }
    };

    const validateJson = (text) => {
        if (!text.trim()) { setJsonError(''); setJsonParsed(null); return; }
        try {
            const parsed = JSON.parse(text);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            const valid = arr.every(item => item.front && item.back);
            if (!valid) { setJsonError('Mỗi từ vựng phải có ít nhất trường "front" và "back"'); setJsonParsed(null); }
            else { setJsonError(''); setJsonParsed(arr); }
        } catch (e) { setJsonError(`JSON không hợp lệ: ${e.message}`); setJsonParsed(null); }
    };

    const handleJsonImport = async () => {
        if (!jsonParsed || jsonParsed.length === 0) return;
        setJsonImporting(true); setJsonImportResult(null);
        let successCount = 0, failCount = 0;
        for (const item of jsonParsed) {
            try {
                const success = await onSave({
                    front: item.front || '', back: item.back || '', synonym: item.synonym || '',
                    example: item.example || '', exampleMeaning: item.exampleMeaning || '',
                    nuance: item.nuance || '', pos: item.pos || '', level: item.level || '',
                    sinoVietnamese: item.sinoVietnamese || '', synonymSinoVietnamese: item.synonymSinoVietnamese || '',
                    action: 'continue', imageBase64: null, audioBase64: null, folderId: selectedFolderId || null
                });
                if (success) successCount++; else failCount++;
            } catch (e) { failCount++; }
        }
        setJsonImporting(false);
        setJsonImportResult({ success: successCount, fail: failCount });
        if (successCount > 0 && failCount === 0) { setJsonInput(''); setJsonParsed(null); }
    };

    const copySampleJson = () => {
        navigator.clipboard.writeText(SAMPLE_JSON);
        setCopiedSample(true);
        setTimeout(() => setCopiedSample(false), 2000);
    };

    // JLPT level colors
    const levelColors = {
        'N5': 'from-emerald-500 to-teal-500',
        'N4': 'from-sky-500 to-blue-500',
        'N3': 'from-amber-500 to-orange-500',
        'N2': 'from-purple-500 to-violet-500',
        'N1': 'from-rose-500 to-pink-500',
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                        Thêm Từ Vựng Mới
                    </h2>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Xây dựng kho tàng kiến thức của bạn</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
                    <Plus className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Tab Switcher */}
            {!batchMode && (
                <div className="flex rounded-2xl bg-gray-100 dark:bg-gray-800/80 p-1.5 gap-1">
                    <button
                        onClick={() => setActiveTab('json')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'json'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100 dark:shadow-none'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <FileJson className="w-4 h-4" />
                        JSON Import
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'manual'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100 dark:shadow-none'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <PenTool className="w-4 h-4" />
                        Thêm Thủ Công
                    </button>
                </div>
            )}

            {/* ============ MANUAL TAB ============ */}
            {(activeTab === 'manual' || batchMode) && (
                <div className="space-y-4">
                    {/* === SECTION 1: Từ vựng chính + AI === */}
                    <div className="relative bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-800 dark:via-gray-800/90 dark:to-gray-800 p-5 rounded-2xl border border-indigo-100 dark:border-gray-700 shadow-sm">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100/50 dark:from-indigo-900/20 to-transparent rounded-bl-full pointer-events-none" />

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Thông tin chính</h3>
                        </div>

                        {/* Main word + AI button */}
                        <div className="flex gap-2 mb-3">
                            <FloatingInput
                                id="front"
                                label="Từ vựng tiếng Nhật"
                                value={front}
                                onChange={(e) => setFront(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                                    }
                                }}
                                inputRef={frontInputRef}
                                required
                                icon={Languages}
                                placeholder="食べる（たべる）"
                                className="flex-1"
                            />
                            {onGeminiAssist && (
                                <button
                                    type="button"
                                    onClick={handleAiAssist}
                                    disabled={isAiLoading || !front.trim()}
                                    className="flex items-center gap-1.5 px-3 md:px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white rounded-xl shadow-lg shadow-violet-200 dark:shadow-violet-900/40 hover:shadow-xl hover:from-violet-700 hover:to-indigo-700 dark:hover:from-violet-600 dark:hover:to-indigo-600 hover:-translate-y-0.5 transition-all font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg flex-shrink-0"
                                    title="Tự động điền thông tin bằng AI (Alt+G)"
                                >
                                    {isAiLoading ? (
                                        <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                                    )}
                                    <span className="hidden sm:inline">AI</span>
                                </button>
                            )}
                        </div>

                        {/* Meaning */}
                        <FloatingInput
                            id="back"
                            label="Ý nghĩa tiếng Việt"
                            value={back}
                            onChange={(e) => setBack(e.target.value)}
                            required
                            icon={MessageSquare}
                            placeholder="Ăn"
                            className="mb-3"
                        />

                        {/* Classification: Level + POS side by side */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Cấp độ JLPT</label>
                                <div className="flex gap-1">
                                    {JLPT_LEVELS.map((lvl) => (
                                        <button
                                            key={lvl.value}
                                            type="button"
                                            onClick={() => setLevel(level === lvl.value ? '' : lvl.value)}
                                            className={`flex-1 py-1.5 md:py-2 rounded-lg text-xs font-bold transition-all duration-200 ${level === lvl.value
                                                ? `bg-gradient-to-r ${levelColors[lvl.value]} text-white shadow-md scale-105`
                                                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                }`}
                                        >
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Từ loại</label>
                                <div className="relative">
                                    <select
                                        value={pos}
                                        onChange={(e) => setPos(e.target.value)}
                                        className="w-full px-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-100 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Chọn --</option>
                                        {Object.entries(POS_TYPES).map(([key, value]) => (
                                            <option key={key} value={key}>{value.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Hán Việt + Synonym row */}
                        <div className="grid grid-cols-2 gap-3">
                            <FloatingInput
                                id="sinoVietnamese"
                                label="Hán Việt"
                                value={sinoVietnamese}
                                onChange={(e) => setSinoVietnamese(e.target.value)}
                                icon={Tag}
                                placeholder="Thực"
                            />
                            <FloatingInput
                                id="synonym"
                                label="Từ đồng nghĩa"
                                value={synonym}
                                onChange={(e) => setSynonym(e.target.value)}
                                placeholder="食事する"
                            />
                        </div>
                    </div>

                    {/* === SECTION 2: Ví dụ & Ngữ cảnh === */}
                    <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Ví dụ & Ngữ cảnh</h3>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Tuỳ chọn</span>
                        </div>

                        <div className="space-y-3">
                            <FloatingTextarea
                                id="example"
                                label="Câu ví dụ tiếng Nhật"
                                value={example}
                                onChange={(e) => setExample(e.target.value)}
                                rows={2}
                                icon={BookOpen}
                            />
                            <FloatingTextarea
                                id="exampleMeaning"
                                label="Nghĩa câu ví dụ (Việt)"
                                value={exampleMeaning}
                                onChange={(e) => setExampleMeaning(e.target.value)}
                                rows={2}
                            />
                            <FloatingTextarea
                                id="nuance"
                                label="Sắc thái / Ghi chú"
                                value={nuance}
                                onChange={(e) => setNuance(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* === SECTION 3: Media (collapsible) === */}
                    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                    <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Ảnh minh hoạ</h3>
                                {imagePreview && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>

                        {showAdvanced && (
                            <div className="px-4 pb-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 space-y-2">
                                        <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-200 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
                                            <ImageIcon className="w-5 h-5 text-gray-300 dark:text-gray-500 group-hover:text-indigo-400 transition-colors mb-1" />
                                            <p className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">Tải ảnh lên</p>
                                            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowImageSearch(true)}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
                                        >
                                            <Search className="w-3 h-3" />
                                            Tìm ảnh online
                                        </button>
                                    </div>
                                    {imagePreview && (
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 shadow-sm group flex-shrink-0">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-white/90 dark:bg-gray-800/90 p-1 rounded-full text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image Search Modal */}
                    <ImageSearchModal
                        isOpen={showImageSearch}
                        onClose={() => setShowImageSearch(false)}
                        onSelectImage={(base64) => setImagePreview(base64)}
                        defaultQuery={front ? front.split('（')[0].split('(')[0].trim() : ''}
                        meaningVi={back || ''}
                    />

                    {/* Batch mode indicator */}
                    {batchMode && (
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 text-center">
                                Đang xử lý từ vựng {currentBatchIndex + 1}/{totalBatchCount}
                            </p>
                        </div>
                    )}

                    {/* === ACTION BUTTONS === */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                            type="button"
                            onClick={async () => {
                                if (batchMode && onBatchNext) {
                                    const success = await onSave({
                                        front, back, synonym, example, exampleMeaning, nuance, pos, level,
                                        sinoVietnamese, synonymSinoVietnamese, action: 'continue',
                                        imageBase64: imagePreview, audioBase64: null, folderId: selectedFolderId || null
                                    });
                                    if (success) {
                                        setFront(''); setBack(''); setSynonym(''); setExample(''); setExampleMeaning('');
                                        setNuance(''); setPos(''); setLevel(''); setSinoVietnamese(''); setSynonymSinoVietnamese('');
                                        setImagePreview(null);
                                        await onBatchNext();
                                    }
                                } else {
                                    handleSave('continue');
                                }
                            }}
                            disabled={isSaving || isAiLoading || !front || !back}
                            className="flex-1 flex items-center justify-center px-5 py-3 md:py-3.5 text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 text-white bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 hover:from-indigo-700 hover:to-violet-700 dark:hover:from-indigo-600 dark:hover:to-violet-600 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                        >
                            {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {batchMode ? `Lưu & Tiếp (${currentBatchIndex + 1}/${totalBatchCount})` : 'Lưu & Thêm Tiếp'}
                        </button>
                        {batchMode && onBatchSkip && (
                            <button
                                type="button"
                                onClick={async () => { await onBatchSkip(); }}
                                disabled={isSaving || isAiLoading}
                                className="flex-1 flex items-center justify-center px-5 py-3 text-sm font-bold rounded-xl text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:-translate-y-0.5 transition-all disabled:opacity-40"
                            >
                                <X className="w-4 h-4 mr-2" />Bỏ qua
                            </button>
                        )}
                        {!batchMode && (
                            <button
                                type="button"
                                onClick={() => handleSave('back')}
                                disabled={isSaving || isAiLoading || !front || !back}
                                className="flex-1 flex items-center justify-center px-5 py-3 text-sm font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:-translate-y-0.5 transition-all disabled:opacity-40"
                            >
                                <Check className="w-4 h-4 mr-2" />Lưu & Về Home
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-5 py-3 text-sm font-medium rounded-xl text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* ============ JSON TAB ============ */}
            {activeTab === 'json' && !batchMode && (
                <div className="space-y-4">
                    {/* Sample JSON */}
                    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-700/50 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <FileJson className="w-4 h-4 text-indigo-500" />
                                JSON mẫu
                            </h3>
                            <button
                                onClick={copySampleJson}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${copiedSample
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 scale-105'
                                    : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                                    }`}
                            >
                                {copiedSample ? (
                                    <><ClipboardCheck className="w-3.5 h-3.5" /> Đã copy!</>
                                ) : (
                                    <><Copy className="w-3.5 h-3.5" /> Copy mẫu</>
                                )}
                            </button>
                        </div>
                        <pre className="p-4 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-gray-50/50 dark:bg-gray-900/30 font-mono leading-relaxed max-h-52 overflow-y-auto">
                            {SAMPLE_JSON}
                        </pre>
                    </div>

                    {/* JSON Input */}
                    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-700/50 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300">Nhập JSON từ vựng</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Dán JSON theo định dạng mẫu phía trên</p>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={jsonInput}
                                onChange={(e) => {
                                    setJsonInput(e.target.value);
                                    validateJson(e.target.value);
                                    setJsonImportResult(null);
                                }}
                                rows="10"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-y outline-none"
                                placeholder={'Dán JSON vào đây...\n\nVí dụ:\n[\n  { "front": "食べる", "back": "Ăn" }\n]'}
                            />

                            {jsonError && (
                                <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                                    <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-xs text-red-600 dark:text-red-400">{jsonError}</span>
                                </div>
                            )}
                            {jsonParsed && !jsonError && (
                                <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">JSON hợp lệ — {jsonParsed.length} từ vựng sẵn sàng nhập</span>
                                </div>
                            )}
                            {jsonImportResult && (
                                <div className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2 ${jsonImportResult.fail === 0
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                    }`}>
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-medium">
                                        Đã thêm {jsonImportResult.success} từ vựng thành công
                                        {jsonImportResult.fail > 0 && `, ${jsonImportResult.fail} thất bại`}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2.5">
                        <button
                            type="button"
                            onClick={handleJsonImport}
                            disabled={!jsonParsed || jsonParsed.length === 0 || jsonImporting}
                            className="flex-1 flex items-center justify-center px-6 py-3 text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 text-white bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 hover:from-indigo-700 hover:to-violet-700 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {jsonImporting ? (
                                <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Đang nhập...</>
                            ) : (
                                <><Plus className="w-5 h-5 mr-2" /> Thêm {jsonParsed ? `${jsonParsed.length} từ vựng` : 'từ vựng'}</>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-3 text-sm font-medium rounded-xl text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Onboarding Tour */}
            <OnboardingTour section="vocabAdd" />
        </div>
    );
};

export default AddCardForm;
