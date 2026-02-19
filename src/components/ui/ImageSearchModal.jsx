import React, { useState, useCallback } from 'react';
import { Search, Image, X, ExternalLink, Settings, Check, Loader2 } from 'lucide-react';
import { searchImages, imageUrlToBase64, isPixabayConfigured, setPixabayApiKey, getPixabayApiKey } from '../../utils/imageSearch';

/**
 * ImageSearchModal - Tìm kiếm và chọn hình ảnh từ Pixabay
 * @param {boolean} isOpen - Hiển thị modal
 * @param {Function} onClose - Đóng modal
 * @param {Function} onSelectImage - Callback khi chọn ảnh, trả về base64
 * @param {string} defaultQuery - Từ khóa tìm kiếm mặc định
 */
const ImageSearchModal = ({ isOpen, onClose, onSelectImage, defaultQuery = '' }) => {
    const [query, setQuery] = useState(defaultQuery);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedImageId, setSelectedImageId] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [showApiKeyInput, setShowApiKeyInput] = useState(!isPixabayConfigured());
    const [apiKeyInput, setApiKeyInput] = useState(getPixabayApiKey());
    const [totalResults, setTotalResults] = useState(0);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        if (!isPixabayConfigured()) {
            setShowApiKeyInput(true);
            return;
        }

        setLoading(true);
        setError('');
        setImages([]);

        try {
            const result = await searchImages(query, { perPage: 12 });
            setImages(result.images);
            setTotalResults(result.total);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [query]);

    const handleSelectImage = useCallback(async (image) => {
        setProcessingId(image.id);
        try {
            // Download and convert to base64
            const base64 = await imageUrlToBase64(image.webformatUrl, 300, 0.7);
            setSelectedImageId(image.id);
            onSelectImage(base64);

            // Close after short delay
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (err) {
            setError('Không thể tải ảnh. Vui lòng thử ảnh khác.');
        } finally {
            setProcessingId(null);
        }
    }, [onSelectImage, onClose]);

    const handleSaveApiKey = () => {
        if (apiKeyInput.trim()) {
            setPixabayApiKey(apiKeyInput.trim());
            setShowApiKeyInput(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Image className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">Tìm hình ảnh</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Cài đặt API Key"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* API Key Input */}
                {showApiKeyInput && (
                    <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30">
                        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                            Cần API key từ Pixabay (miễn phí). Đăng ký tại{' '}
                            <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                                pixabay.com
                            </a>
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={apiKeyInput}
                                onChange={e => setApiKeyInput(e.target.value)}
                                placeholder="Nhập Pixabay API Key..."
                                className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm"
                            />
                            <button
                                onClick={handleSaveApiKey}
                                disabled={!apiKeyInput.trim()}
                                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                )}

                {/* Search bar */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Tìm hình ảnh (tiếng Anh cho kết quả tốt nhất)..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-800 dark:text-gray-200"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading || !query.trim()}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Tìm
                        </button>
                    </div>
                    {totalResults > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">{totalResults.toLocaleString()} kết quả từ Pixabay</p>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
                        {error}
                    </div>
                )}

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-3">
                    {images.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Image className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm">Nhập từ khóa để tìm hình ảnh</p>
                            <p className="text-xs mt-1">Powered by Pixabay (miễn phí)</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        {images.map(image => (
                            <button
                                key={image.id}
                                onClick={() => handleSelectImage(image)}
                                disabled={processingId !== null}
                                className={`relative group rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${selectedImageId === image.id
                                        ? 'border-green-500 ring-2 ring-green-500/30'
                                        : 'border-transparent hover:border-indigo-400'
                                    }`}
                            >
                                <img
                                    src={image.previewUrl}
                                    alt={image.tags}
                                    className="w-full h-24 object-cover"
                                    loading="lazy"
                                />

                                {/* Overlay on hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    {processingId === image.id ? (
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    ) : selectedImageId === image.id ? (
                                        <Check className="w-6 h-6 text-green-400" />
                                    ) : (
                                        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            Chọn
                                        </span>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                    <p className="text-[8px] text-white truncate">{image.tags}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <a
                        href="https://pixabay.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Powered by Pixabay
                    </a>
                    <button
                        onClick={onClose}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageSearchModal;
