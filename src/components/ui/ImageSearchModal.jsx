import React, { useState, useCallback, useEffect } from 'react';
import { Search, Image, X, ExternalLink, Check, Loader2 } from 'lucide-react';
import { searchImages, imageUrlToBase64, isPixabayConfigured, prepareSearchQuery } from '../../utils/imageSearch';

/**
 * ImageSearchModal - Tìm kiếm và chọn hình ảnh từ Pixabay
 * Hỗ trợ tìm kiếm trực tiếp bằng tiếng Nhật (giống pixabay.com)
 * @param {boolean} isOpen - Hiển thị modal
 * @param {Function} onClose - Đóng modal
 * @param {Function} onSelectImage - Callback khi chọn ảnh, trả về base64
 * @param {string} defaultQuery - Từ khóa tìm kiếm mặc định
 * @param {string} meaningVi - Nghĩa tiếng Việt (fallback nếu tiếng Nhật không có kết quả)
 */
const ImageSearchModal = ({ isOpen, onClose, onSelectImage, defaultQuery = '', meaningVi = '' }) => {
    const [query, setQuery] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedImageId, setSelectedImageId] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [totalResults, setTotalResults] = useState(0);
    const [searchInfo, setSearchInfo] = useState('');
    const [hasAutoSearched, setHasAutoSearched] = useState(false);

    // Tự động search khi mở modal
    useEffect(() => {
        if (isOpen && defaultQuery && !hasAutoSearched) {
            setHasAutoSearched(true);
            const cleanQuery = prepareSearchQuery(defaultQuery);
            setQuery(cleanQuery);
            if (cleanQuery) {
                doSearch(cleanQuery);
            }
        }
        if (!isOpen) {
            setHasAutoSearched(false);
            setImages([]);
            setTotalResults(0);
            setSearchInfo('');
            setSelectedImageId(null);
            setError('');
        }
    }, [isOpen, defaultQuery]);

    // Thực hiện tìm kiếm
    const doSearch = async (searchText) => {
        if (!searchText.trim()) return;
        if (!isPixabayConfigured()) {
            setError('API key chưa được cấu hình. Vui lòng thêm VITE_PIXABAY_API_KEY vào file .env');
            return;
        }

        setLoading(true);
        setError('');
        setImages([]);
        setSearchInfo('');

        try {
            // Tìm trực tiếp bằng tiếng Nhật (Pixabay hỗ trợ lang=ja)
            const result = await searchImages(searchText, { perPage: 12, lang: 'ja' });
            setImages(result.images);
            setTotalResults(result.total);
            setSearchInfo(`${result.total.toLocaleString()} kết quả cho "${searchText}"`);

            // Nếu không có kết quả VÀ có nghĩa tiếng Việt → thử tìm bằng tiếng Việt
            if (result.images.length === 0 && meaningVi && meaningVi.trim()) {
                setSearchInfo(`Không tìm thấy "${searchText}". Đang thử "${meaningVi}"...`);
                const viResult = await searchImages(meaningVi.trim(), { perPage: 12, lang: 'vi' });
                if (viResult.images.length > 0) {
                    setImages(viResult.images);
                    setTotalResults(viResult.total);
                    setSearchInfo(`${viResult.total.toLocaleString()} kết quả cho "${meaningVi}"`);
                } else {
                    // Thử lần cuối bằng tiếng Anh (en)
                    const enResult = await searchImages(meaningVi.trim(), { perPage: 12, lang: 'en' });
                    if (enResult.images.length > 0) {
                        setImages(enResult.images);
                        setTotalResults(enResult.total);
                        setSearchInfo(`${enResult.total.toLocaleString()} kết quả cho "${meaningVi}" (EN)`);
                    } else {
                        setSearchInfo(`Không tìm thấy kết quả cho "${searchText}"`);
                    }
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tìm kiếm khi bấm nút hoặc Enter
    const handleSearch = useCallback(() => {
        if (query.trim()) {
            doSearch(query.trim());
        }
    }, [query, meaningVi]);

    const handleSelectImage = useCallback(async (image) => {
        setProcessingId(image.id);
        try {
            const base64 = await imageUrlToBase64(image.webformatUrl, 300, 0.7);
            setSelectedImageId(image.id);
            onSelectImage(base64);
            setTimeout(() => onClose(), 500);
        } catch (err) {
            setError('Không thể tải ảnh. Vui lòng thử ảnh khác.');
        } finally {
            setProcessingId(null);
        }
    }, [onSelectImage, onClose]);

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
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

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
                                placeholder="Tìm bằng tiếng Nhật, Anh, hoặc Việt..."
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

                    {searchInfo && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{searchInfo}</p>
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
                            <p className="text-sm">
                                {totalResults === 0 && query ? 'Không tìm thấy hình ảnh' : 'Nhập từ khóa để tìm hình ảnh'}
                            </p>
                            <p className="text-xs mt-1">Hỗ trợ 日本語 · English · Tiếng Việt</p>
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
