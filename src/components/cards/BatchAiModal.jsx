import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Upload, Image as ImageIcon, X, Play, StopCircle, Loader2, CheckCircle, AlertTriangle, Camera, FileText, Sparkles } from 'lucide-react';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLanguageService } from '../../languages';
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';
import { AiCreditPill, AiCostTag } from '../ui/AiCreditBadge';

const BatchAiModal = ({
    isOpen,
    onClose,
    onGeminiAssist,
    onExtractVocabFromImage,
    aiCreditsRemaining,
    onGenerateComplete,
    initialTab = 'text',
    existingCards = []
}) => {
    const { isEnglishMode, isKoreanMode } = useTargetLanguage();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState(initialTab); // 'text' | 'image'

    // Text input state
    const [textInput, setTextInput] = useState('');

    // Image OCR state
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isOcrLoading, setIsOcrLoading] = useState(false);

    // Generation progress state
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentWord: '' });
    const [processedWords, setProcessedWords] = useState([]);

    const isCancelledRef = useRef(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setTextInput('');
            setSelectedImage(null);
            setImagePreview(null);
            setIsOcrLoading(false);
            setIsGenerating(false);
            setProgress({ current: 0, total: 0, currentWord: '' });
            setProcessedWords([]);
            isCancelledRef.current = false;
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await processSelectedFile(file);
        } else {
            showToast('Chỉ hỗ trợ file hình ảnh!', 'error');
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) await processSelectedFile(file);
    };

    const processSelectedFile = async (file) => {
        try {
            setSelectedImage(file);
            const compressed = await compressImage(file);
            setImagePreview(compressed);
        } catch (error) {
            console.error('Lỗi nén ảnh:', error);
            showToast('Không thể nén ảnh này. Vui lòng chọn ảnh khác.', 'error');
        }
    };

    const handleStartOcr = async () => {
        if (!imagePreview || !onExtractVocabFromImage) return;

        setIsOcrLoading(true);
        try {
            const extractedWords = await onExtractVocabFromImage(imagePreview);
            if (extractedWords && Array.isArray(extractedWords) && extractedWords.length > 0) {
                const newText = extractedWords.join('\n');
                setTextInput(prev => {
                    const cleanPrev = prev.trim();
                    return cleanPrev ? `${cleanPrev}\n${newText}` : newText;
                });
                showToast(`Đã nhận diện thành công ${extractedWords.length} từ vựng! 🎉`, 'success');
                setActiveTab('text');
            } else {
                showToast('Không nhận diện được từ vựng nào trong ảnh.', 'warning');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            showToast('Có lỗi xảy ra khi nhận diện chữ từ ảnh chụp.', 'error');
        } finally {
            setIsOcrLoading(false);
            setSelectedImage(null);
            setImagePreview(null);
        }
    };

    const handleStartGeneration = async () => {
        const words = textInput
            .split('\n')
            .map(w => w.trim())
            .filter(Boolean);

        if (words.length === 0) {
            showToast('Vui lòng nhập ít nhất một từ vựng!', 'error');
            return;
        }

        if (words.length > 20) {
            showToast('Chỉ hỗ trợ tạo tối đa 20 từ cùng một lúc để đảm bảo tốc độ và chất lượng.', 'warning');
            return;
        }

        setIsGenerating(true);
        isCancelledRef.current = false;
        setProgress({ current: 0, total: words.length, currentWord: '' });
        setProcessedWords([]);

        const generatedCards = [];
        let skippedCount = 0;

        for (let i = 0; i < words.length; i++) {
            if (isCancelledRef.current) {
                showToast('Đã dừng tiến trình tạo thẻ.', 'warning');
                break;
            }

            const word = words[i];
            setProgress({ current: i + 1, total: words.length, currentWord: word });

            const wordNormalized = word.split('（')[0].split('(')[0].trim().toLowerCase();
            const exists = existingCards.some(c => {
                if (!c.front) return false;
                const frontNorm = c.front.split('（')[0].split('(')[0].trim().toLowerCase();
                return frontNorm === wordNormalized;
            });

            if (exists) {
                skippedCount++;
                setProcessedWords(prev => [...prev, { word, status: 'exists' }]);
                await new Promise(resolve => setTimeout(resolve, 150));
                continue;
            }

            try {
                const aiData = await onGeminiAssist(word, '', '', false);
                if (aiData) {
                    const langService = getLanguageService(word, isEnglishMode, isKoreanMode);
                    const cardIsEng = langService.code === 'en';
                    const cardIsKo = langService.code === 'ko';

                    generatedCards.push({
                        id: `new_${Date.now()}_${i}_${Math.random()}`,
                        isNew: true,
                        front: aiData.front || word,
                        back: aiData.meaning || '',
                        ipa: cardIsEng ? (aiData.ipa || '') : '',
                        sinoVietnamese: cardIsEng ? '' : (aiData.sinoVietnamese || ''),
                        synonym: aiData.synonym || '',
                        synonymSinoVietnamese: (cardIsEng || cardIsKo) ? '' : (aiData.synonymSinoVietnamese || ''),
                        example: aiData.example || '',
                        exampleMeaning: aiData.exampleMeaning || '',
                        nuance: aiData.nuance || '',
                        pos: aiData.pos || '',
                        level: aiData.level || '',
                        reading: cardIsEng ? '' : (aiData.reading || ''),
                        accent: (cardIsEng || cardIsKo) ? '' : (aiData.accent !== undefined ? String(aiData.accent) : ''),
                        targetLanguage: cardIsKo ? 'ko' : (cardIsEng ? 'en' : 'ja'),
                        imageBase64: null,
                        audioBase64: null
                    });
                    setProcessedWords(prev => [...prev, { word, status: 'success' }]);
                } else {
                    generatedCards.push({
                        id: `new_${Date.now()}_${i}_${Math.random()}`,
                        isNew: true,
                        front: word,
                        back: '',
                        ipa: '',
                        sinoVietnamese: '',
                        synonym: '',
                        synonymSinoVietnamese: '',
                        example: '',
                        exampleMeaning: '',
                        nuance: '',
                        pos: '',
                        level: '',
                        reading: '',
                        accent: '',
                        imageBase64: null,
                        audioBase64: null
                    });
                    setProcessedWords(prev => [...prev, { word, status: 'error' }]);
                }
            } catch (error) {
                console.error(`Error generating: ${word}`, error);
                generatedCards.push({
                    id: `new_${Date.now()}_${i}_${Math.random()}`,
                    isNew: true,
                    front: word,
                    back: '',
                    sinoVietnamese: '',
                    synonym: '',
                    synonymSinoVietnamese: '',
                    example: '',
                    exampleMeaning: '',
                    nuance: '',
                    pos: '',
                    level: '',
                    reading: '',
                    accent: '',
                    imageBase64: null,
                    audioBase64: null
                });
                setProcessedWords(prev => [...prev, { word, status: 'error' }]);
            }

            if (i < words.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        if (generatedCards.length > 0) {
            onGenerateComplete(generatedCards);
        }

        setIsGenerating(false);
        onClose();

        if (skippedCount > 0) {
            showToast(`Đã tạo ${generatedCards.length} thẻ. (Bỏ qua ${skippedCount} từ đã có trong học phần)`, 'warning');
        } else {
            showToast(`Đã tạo thành công ${generatedCards.length} thẻ bằng AI! 🎉`, 'success');
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => !isGenerating && !isOcrLoading && onClose()}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border-2 border-slate-200 dark:border-slate-800 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Duolingo-Styled Header */}
                <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-400/40 flex items-center justify-center font-black shrink-0 shadow-xs">
                            {activeTab === 'image' ? <Camera className="w-6 h-6 stroke-[2.2]" /> : <Sparkles className="w-6 h-6 stroke-[2.2]" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight truncate">
                                {activeTab === 'image' ? 'Quét từ vựng từ ảnh (OCR)' : 'Tạo từ vựng hàng loạt bằng AI'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                {activeTab === 'image'
                                    ? 'Trích xuất văn bản từ hình ảnh chụp tài liệu hoặc giáo trình'
                                    : 'AI tự tra từ điển, tạo câu ví dụ ngắn thông dụng và âm Hán Việt'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <AiCreditPill featureId={activeTab === 'image' ? 'ocr_image' : 'vocab_gen'} remaining={aiCreditsRemaining} compact />
                        {(!isGenerating && !isOcrLoading) && (
                            <button 
                                onClick={onClose} 
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Generative Progress View */}
                    {isGenerating ? (
                        <div className="space-y-5 py-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang phân tích từ vựng bằng AI...
                                </span>
                                <span className="text-slate-500 font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                    {progress.current} / {progress.total}
                                </span>
                            </div>

                            {/* Duolingo Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>

                            {/* Current word display */}
                            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                        Từ đang xử lý:
                                    </p>
                                    <p className="text-xl font-japanese font-black text-slate-900 dark:text-white mt-0.5 truncate">
                                        {progress.currentWord}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { isCancelledRef.current = true; }}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 text-xs font-bold rounded-xl transition border-2 border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <StopCircle className="w-4 h-4" /> Dừng lại
                                </button>
                            </div>

                            {/* Real-time word log */}
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {processedWords.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-750">
                                        <span className="font-japanese font-bold text-slate-800 dark:text-slate-200 text-sm">{item.word}</span>
                                        {item.status === 'success' ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành
                                            </span>
                                        ) : item.status === 'exists' ? (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Đã có sẵn
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 font-medium">Bỏ qua</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Duolingo Segmented Tabs */}
                            <div className="flex bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('text')}
                                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        activeTab === 'text'
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Danh sách từ (AI)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('image')}
                                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        activeTab === 'image'
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Camera className="w-4 h-4" />
                                    <span>Quét ảnh (OCR)</span>
                                </button>
                            </div>

                            {/* Tab 1: Text List Input */}
                            {activeTab === 'text' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Danh sách từ vựng (mỗi từ một dòng, tối đa 20 từ):
                                        </label>
                                        <textarea
                                            rows={6}
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                            placeholder={`Ví dụ:\n食べる\n図書館\n美味しい\n約束`}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-750 rounded-2xl outline-none text-xs sm:text-sm font-japanese dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 transition-all leading-relaxed"
                                        />
                                    </div>

                                    {/* Duolingo Friendly Helper Tip */}
                                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                                        <div className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                                            <span>💡</span>
                                            <span>Cơ chế tạo thẻ thông minh</span>
                                        </div>
                                        <p className="leading-relaxed">
                                            AI sẽ tự động tra cứu từ điển, xác định chữ Kanji chuẩn, phiên âm Hiragana, phân tích âm Hán Việt và tạo câu ví dụ ngắn (5 - 10 từ) dễ học.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: OCR Image Scanner */}
                            {activeTab === 'image' && (
                                <div className="space-y-4">
                                    {isOcrLoading ? (
                                        <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-3xl p-10 text-center bg-emerald-50/30 dark:bg-emerald-950/20">
                                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-600 mb-3" />
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">Đang phân tích chữ từ ảnh chụp...</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quá trình này mất khoảng vài giây. Vui lòng chờ nhé!</p>
                                        </div>
                                    ) : imagePreview ? (
                                        <div className="space-y-3">
                                            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-950/10 flex items-center justify-center max-h-[220px]">
                                                <img src={imagePreview} alt="Scanned Preview" className="max-h-[220px] object-contain" />
                                                <button
                                                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                                    className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-950 text-white rounded-xl transition cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleStartOcr}
                                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md active:translate-y-0.5 active:border-b-0 transition flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                <span>Bắt đầu quét & trích xuất từ ảnh</span>
                                                <AiCostTag featureId="ocr_image" darkBg />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                            className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-3xl p-8 text-center bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-50/60 transition space-y-3"
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <input
                                                ref={cameraInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />

                                            <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-600 border-2 border-emerald-400/40 flex items-center justify-center">
                                                <Upload className="w-6 h-6 stroke-[2.2]" />
                                            </div>

                                            <div>
                                                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                                                    Kéo thả ảnh hoặc chọn ảnh tài liệu
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Hỗ trợ JPG, PNG, WEBP (sách giáo khoa, vở ghi, đề thi...)
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-center gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-4 py-2 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 active:translate-y-0.5 active:border-b-2 transition cursor-pointer"
                                                >
                                                    Chọn từ máy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="px-4 py-2 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border-2 border-b-4 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 active:translate-y-0.5 active:border-b-2 transition cursor-pointer flex items-center gap-1.5"
                                                >
                                                    <Camera className="w-3.5 h-3.5" />
                                                    Chụp ảnh
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Duolingo-Styled Footer */}
                {(!isGenerating && !isOcrLoading) && (
                    <div className="p-4 sm:p-5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 active:translate-y-0.5 active:border-b-2 transition cursor-pointer"
                        >
                            Hủy
                        </button>

                        {activeTab === 'text' && (
                            <button
                                type="button"
                                onClick={handleStartGeneration}
                                disabled={!textInput.trim()}
                                className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="w-4 h-4 fill-white" />
                                <span>Tạo thẻ bằng AI</span>
                                <AiCostTag featureId="vocab_gen" darkBg />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatchAiModal;
