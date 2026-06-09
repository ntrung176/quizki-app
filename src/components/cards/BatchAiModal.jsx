import React, { useState, useRef, useEffect } from 'react';
import { Sparkle, Upload, Image as ImageIcon, X, Play, StopCircle, Loader2, CheckCircle, AlertTriangle, Camera } from 'lucide-react'
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';

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
    const [processedWords, setProcessedWords] = useState([]); // Array of { word, status: 'success' | 'error' }

    const isCancelledRef = useRef(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Reset state on open/close
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

    // Handle drag and drop events
    const handleDragOver = (e) => {
        e.preventDefault();
    };

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
        if (file) {
            await processSelectedFile(file);
        }
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

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    // Run OCR using onExtractVocabFromImage
    const handleStartOcr = async () => {
        if (!imagePreview || !onExtractVocabFromImage) return;

        setIsOcrLoading(true);
        try {
            const extractedWords = await onExtractVocabFromImage(imagePreview);
            if (extractedWords && Array.isArray(extractedWords) && extractedWords.length > 0) {
                // Append extracted words to text area
                const newText = extractedWords.join('\n');
                setTextInput(prev => {
                    const cleanPrev = prev.trim();
                    return cleanPrev ? `${cleanPrev}\n${newText}` : newText;
                });
                showToast(`Đã nhận diện thành công ${extractedWords.length} từ vựng!`, 'success');
                // Switch back to text tab to verify
                setActiveTab('text');
            } else {
                showToast('Không nhận diện được từ vựng tiếng Nhật nào trong ảnh.', 'warning');
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

    // Sequential bulk generation
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
            showToast('Chỉ hỗ trợ tạo tối đa 20 từ cùng một lúc để tránh quá tải.', 'warning');
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

            // Check duplicate in study set
            const wordNormalized = word.split('（')[0].split('(')[0].trim().toLowerCase();
            const exists = existingCards.some(c => {
                if (!c.front) return false;
                const frontNorm = c.front.split('（')[0].split('(')[0].trim().toLowerCase();
                return frontNorm === wordNormalized;
            });

            if (exists) {
                skippedCount++;
                setProcessedWords(prev => [...prev, { word, status: 'exists' }]);
                // Small delay to make the skipping readable in UI logs
                await new Promise(resolve => setTimeout(resolve, 150));
                continue;
            }

            try {
                const aiData = await onGeminiAssist(word, '', '', false);
                if (aiData) {
                    generatedCards.push({
                        id: `new_${Date.now()}_${i}_${Math.random()}`,
                        isNew: true,
                        front: aiData.frontWithFurigana || word,
                        back: aiData.meaning || '',
                        sinoVietnamese: aiData.sinoVietnamese || '',
                        synonym: aiData.synonym || '',
                        synonymSinoVietnamese: aiData.synonymSinoVietnamese || '',
                        example: aiData.example || '',
                        exampleMeaning: aiData.exampleMeaning || '',
                        nuance: aiData.nuance || '',
                        pos: aiData.pos || '',
                        level: aiData.level || '',
                        imageBase64: null,
                        audioBase64: null
                    });
                    setProcessedWords(prev => [...prev, { word, status: 'success' }]);
                } else {
                    // Fallback to empty card if AI returns null
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
                    imageBase64: null,
                    audioBase64: null
                });
                setProcessedWords(prev => [...prev, { word, status: 'error' }]);
            }

            // Pause briefly between calls
            if (i < words.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        // Callback with all generated cards
        if (generatedCards.length > 0) {
            onGenerateComplete(generatedCards);
        }

        setIsGenerating(false);
        onClose();

        if (skippedCount > 0) {
            showToast(`Đã tạo ${generatedCards.length} thẻ. Bỏ qua ${skippedCount} từ đã có trong học phần.`, 'warning');
        } else {
            showToast(`Đã tạo thành công ${generatedCards.length} thẻ bằng AI!`, 'success');
        }
    };

    const handleStopGeneration = () => {
        isCancelledRef.current = true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => !isGenerating && !isOcrLoading && onClose()}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50/50 to-purple-50/55 dark:from-slate-900 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            {activeTab === 'image' ? <ImageIcon className="w-5 h-5" /> : <Sparkle className="w-5 h-5 animate-pulse" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                                {activeTab === 'image' ? 'Quét từ vựng từ ảnh chụp' : 'Tạo bằng AI hàng loạt'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {activeTab === 'image' ? 'Trích xuất từ vựng tiếng Nhật từ hình ảnh tài liệu' : 'Tạo nhiều thẻ từ vựng đầy đủ thông tin cùng lúc'}
                            </p>
                        </div>
                    </div>
                    {(!isGenerating && !isOcrLoading) && (
                        <button 
                            onClick={onClose} 
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-6">
                    {/* Generative Progress View */}
                    {isGenerating ? (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Loader2 className="w-4 h-4 animate-spin animate-infinite" />
                                    Đang phân tích từ vựng...
                                </span>
                                <span className="text-slate-500 font-mono">
                                    {progress.current} / {progress.total}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                                <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300 shadow-md"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                ></div>
                            </div>

                            {/* Current word display */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">TỪ ĐANG PHÂN TÍCH</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-1 font-mono tracking-wide">{progress.currentWord}</p>
                                </div>
                                <button
                                    onClick={handleStopGeneration}
                                    className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-105 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-450 text-xs font-bold rounded-lg transition-all flex items-center gap-1 border border-rose-100 dark:border-rose-900/30"
                                >
                                    <StopCircle className="w-4 h-4" /> Dừng lại
                                </button>
                            </div>

                            {/* Real-time word log */}
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {processedWords.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg animate-fade-in">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{item.word}</span>
                                        {item.status === 'success' ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" /> Thành công
                                            </span>
                                        ) : item.status === 'exists' ? (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Đã có trong học phần
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Fallback (Rỗng)
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>

                            {/* Tab 1: Text List Input */}
                            {activeTab === 'text' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                            Danh sách từ vựng (mỗi từ một dòng)
                                        </label>
                                        <textarea
                                            rows={6}
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                            placeholder="Ví dụ:&#10;食べる&#10;図書館&#10;美味しい"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono leading-relaxed"
                                        />
                                    </div>

                                    {/* Warnings/Credits Info */}
                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3.5 text-xs text-indigo-700 dark:text-indigo-300 space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <Sparkle className="w-3.5 h-3.5 text-indigo-500" />
                                            Cơ chế hoạt động của AI
                                        </div>
                                        <p className="leading-relaxed">
                                            Hệ thống sẽ tự động tra cứu từ điển và dùng AI để điền đầy đủ các thông tin cho thẻ từ vựng: phiên âm, từ loại, cấp độ JLPT, âm Hán Việt, câu ví dụ kèm dịch nghĩa,...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: OCR Image Scanner */}
                            {activeTab === 'image' && (
                                <div className="space-y-4">
                                    {isOcrLoading ? (
                                        <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-10 text-center bg-slate-50 dark:bg-slate-900/30">
                                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600 mb-3" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Đang phân tích chữ trong hình ảnh...</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quá trình này có thể mất vài giây. Vui lòng chờ.</p>
                                        </div>
                                    ) : imagePreview ? (
                                        <div className="space-y-4">
                                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950/10 flex items-center justify-center max-h-[220px]">
                                                <img src={imagePreview} alt="Scanned Preview" className="max-h-[220px] object-contain" />
                                                <button
                                                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                                    className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-950 text-white rounded-full transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleStartOcr}
                                                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 dark:shadow-none hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <Sparkle className="w-4 h-4" />
                                                Bắt đầu quét & trích xuất từ ảnh
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-900/20 transition-all"
                                        >
                                            <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                Kéo thả ảnh chụp tài liệu vào đây
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                                                Hỗ trợ các file định dạng JPG, PNG
                                            </p>

                                            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
                                                >
                                                    <Camera className="w-4 h-4" />
                                                    Chụp ảnh bằng Camera
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-bold rounded-xl shadow-sm transition-all"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    Chọn từ thiết bị
                                                </button>
                                            </div>

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <input
                                                type="file"
                                                ref={cameraInputRef}
                                                onChange={handleFileSelect}
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                            />
                                        </div>
                                    )}

                                    {/* Image Scan Warning */}
                                    <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3.5 text-xs text-amber-700 dark:text-amber-305 space-y-1">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <Sparkle className="w-3.5 h-3.5 text-indigo-500" />
                                            Lưu ý quét ảnh
                                        </div>
                                        <p className="leading-relaxed">
                                            Các từ sau khi trích xuất từ ảnh chụp sẽ tự động xuất hiện ở tab <strong>Nhập danh sách chữ</strong> để bạn có thể xem lại trước khi tạo thẻ bằng AI.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {!isGenerating && (
                    <div className="flex items-center justify-between p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <button
                            onClick={onClose}
                            disabled={isOcrLoading}
                            className="px-4 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            Hủy bỏ
                        </button>
                        {activeTab === 'text' && (
                            <button
                                onClick={handleStartGeneration}
                                disabled={isOcrLoading || !textInput.trim()}
                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:shadow-none"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Bắt đầu tạo bằng AI
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatchAiModal;
