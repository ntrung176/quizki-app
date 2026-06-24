import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Loader2, ArrowLeft, Eye, Check } from 'lucide-react';
import { ROUTES } from '../../router';

const ImportScreen = ({ onImport }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success'); // 'success' | 'error' | 'warning'
    const [parsedCards, setParsedCards] = useState(null); // Parsed but not yet imported
    const [isConfirming, setIsConfirming] = useState(false);

    const MAX_FILE_SIZE_MB = 15;

    const showMessage = (text, type = 'success') => {
        setMessage(text);
        setMessageType(type);
        if (type === 'success') {
            setTimeout(() => setMessage(''), 6000);
        }
    };

    const parseFile = (file) => {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            showMessage(`⚠️ File quá lớn (${fileSizeMB.toFixed(1)} MB). Giới hạn ${MAX_FILE_SIZE_MB} MB.`, 'warning');
            return;
        }

        setFileName(file.name);
        setIsLoading(true);
        setMessage('');
        setParsedCards(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvText = event.target.result;
                const lines = csvText.split('\n');
                const cardsToImport = [];
                let invalidCount = 0;

                lines.forEach((line, index) => {
                    if (index === 0) return; // Skip header
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return;

                    const fields = trimmedLine.split('\t').map(field =>
                        field ? field.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : ''
                    );

                    if (fields.length < 2 || !fields[0] || !fields[1]) {
                        invalidCount++;
                        return;
                    }

                    // Column layout (0-indexed):
                    // 0: front | 1: back | 2: synonym | 3: example | 4: exampleMeaning
                    // 5: nuance | 6: createdAtRaw | 7: frontWithFurigana
                    // 8-16: SRS fields (intervalIndex_back, streak_back, nextReview_back, ...)
                    // 17: pos | 18: level | 19: sinoVietnamese | 20: synonymSinoVietnamese
                    // 21: audioBase64 | 22: imageBase64
                    const card = {
                        front: fields[0],
                        back: fields[1],
                        synonym: fields[2] || '',
                        example: fields[3] || '',
                        exampleMeaning: fields[4] || '',
                        nuance: fields[5] || '',
                    };

                    // Parse createdAt
                    const createdAtRaw = fields[6] || '';
                    if (createdAtRaw) {
                        const ts = parseInt(createdAtRaw);
                        if (!isNaN(ts) && ts > 0) {
                            card.createdAt = new Date(ts);
                        }
                    }

                    // frontWithFurigana (field 7)
                    if (fields[7] && fields[7].trim()) {
                        card.frontWithFurigana = fields[7];
                    }

                    // SRS data (fields 8-16)
                    if (fields.length >= 17) {
                        let fi = 8;
                        card.intervalIndex_back = parseInt(fields[fi++]) || -1;
                        card.correctStreak_back = parseInt(fields[fi++]) || 0;
                        card.nextReview_back_timestamp = parseInt(fields[fi++]) || Date.now();
                        card.intervalIndex_synonym = parseInt(fields[fi++]) || -999;
                        card.correctStreak_synonym = parseInt(fields[fi++]) || 0;
                        card.nextReview_synonym_timestamp = parseInt(fields[fi++]) || new Date(9999, 0, 1).getTime();
                        card.intervalIndex_example = parseInt(fields[fi++]) || -999;
                        card.correctStreak_example = parseInt(fields[fi++]) || 0;
                        card.nextReview_example_timestamp = parseInt(fields[fi++]) || new Date(9999, 0, 1).getTime();

                        // Metadata (fields 17+)
                        if (fi < fields.length && fields[fi]) card.pos = fields[fi]; fi++;
                        if (fi < fields.length && fields[fi]) card.level = fields[fi]; fi++;
                        if (fi < fields.length && fields[fi]) card.sinoVietnamese = fields[fi]; fi++;
                        if (fi < fields.length && fields[fi]) card.synonymSinoVietnamese = fields[fi]; fi++;
                        if (fi < fields.length && fields[fi] && fields[fi].trim().length > 100) card.audioBase64 = fields[fi]; fi++;
                        if (fi < fields.length && fields[fi] && fields[fi].trim().length > 100) card.imageBase64 = fields[fi];
                    } else if (fields.length >= 9) {
                        // Minimal SRS data (8-column format)
                        card.intervalIndex_back = parseInt(fields[8]) || -1;
                        card.correctStreak_back = parseInt(fields[9]) || 0;
                        card.nextReview_back_timestamp = parseInt(fields[10]) || Date.now();
                    } else {
                        // No SRS data — fresh card
                        card.intervalIndex_back = -1;
                        card.nextReview_back_timestamp = Date.now();
                    }

                    cardsToImport.push(card);
                });

                if (cardsToImport.length > 0) {
                    setParsedCards({ cards: cardsToImport, invalidCount });
                } else {
                    showMessage('File lỗi hoặc rỗng. Không có dữ liệu hợp lệ.', 'error');
                }
            } catch (error) {
                console.error('Import parse error:', error);
                showMessage('Lỗi đọc file. Hãy kiểm tra định dạng TSV.', 'error');
            }
            setIsLoading(false);
        };
        reader.onerror = () => {
            showMessage('Không thể đọc file. Thử lại.', 'error');
            setIsLoading(false);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleFileParse = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        parseFile(file);
    };

    const handleConfirmImport = async () => {
        if (!parsedCards) return;
        setIsConfirming(true);
        try {
            await onImport(parsedCards.cards);
            const msg = parsedCards.invalidCount > 0
                ? `✅ Thành công: ${parsedCards.cards.length} thẻ. ${parsedCards.invalidCount} dòng lỗi đã bỏ qua.`
                : `✅ Thành công: ${parsedCards.cards.length} thẻ đã nhập.`;
            showMessage(msg, 'success');
            setParsedCards(null);
            setFileName('');
        } catch (error) {
            console.error('Import error:', error);
            showMessage('Lỗi khi lưu dữ liệu. Thử lại.', 'error');
        }
        setIsConfirming(false);
    };

    const handleCancelPreview = () => {
        setParsedCards(null);
        setFileName('');
        setMessage('');
    };

    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <Link
                    to={ROUTES.VOCAB_REVIEW}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                    title="Quay lại thư viện"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Nhập Dữ Liệu
                </h2>
            </div>

            {/* File Upload Area — hidden when preview is shown */}
            {!parsedCards && (
                <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-3xl bg-indigo-50/50 dark:bg-indigo-900/20 p-10 flex flex-col items-center justify-center text-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                    <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm mb-4">
                        <Upload className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <label className="cursor-pointer">
                        <span className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all inline-block">
                            Chọn File .TSV
                        </span>
                        <input
                            type="file"
                            className="hidden"
                            accept=".tsv,.txt"
                            onChange={handleFileParse}
                            disabled={isLoading}
                        />
                    </label>
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Giới hạn {MAX_FILE_SIZE_MB} MB</p>
                    {fileName && <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">{fileName}</p>}
                    {isLoading && <Loader2 className="animate-spin mt-4 text-indigo-500 dark:text-indigo-400" />}
                    {message && (
                        <p className={`mt-4 text-sm font-bold ${messageType === 'success' ? 'text-emerald-600 dark:text-emerald-400' : messageType === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {message}
                        </p>
                    )}
                </div>
            )}

            {/* Preview before import */}
            {parsedCards && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                Xem trước: {parsedCards.cards.length} thẻ
                            </h3>
                            {parsedCards.invalidCount > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                                    {parsedCards.invalidCount} dòng lỗi bỏ qua
                                </span>
                            )}
                        </div>
                        <button onClick={handleCancelPreview} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                            Hủy
                        </button>
                    </div>

                    {/* Sample cards preview */}
                    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide grid grid-cols-3 gap-2">
                            <span>Từ vựng</span>
                            <span>Nghĩa</span>
                            <span>Trạng thái</span>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                            {parsedCards.cards.slice(0, 10).map((card, i) => (
                                <div key={i} className="px-4 py-2.5 grid grid-cols-3 gap-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate font-japanese">{card.front}</span>
                                    <span className="text-gray-600 dark:text-gray-400 truncate">{card.back}</span>
                                    <span className="text-xs">
                                        {card.audioBase64 ? '🔊 ' : ''}
                                        {card.imageBase64 ? '🖼 ' : ''}
                                        {card.intervalIndex_back >= 0 ? `SRS: ${card.intervalIndex_back}` : '✨ Mới'}
                                    </span>
                                </div>
                            ))}
                            {parsedCards.cards.length > 10 && (
                                <div className="px-4 py-2 text-xs text-center text-gray-400">
                                    ... và {parsedCards.cards.length - 10} thẻ nữa
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Confirm button */}
                    <button
                        onClick={handleConfirmImport}
                        disabled={isConfirming}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {isConfirming
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang nhập...</>
                            : <><Check className="w-4 h-4" /> Xác nhận nhập {parsedCards.cards.length} thẻ</>
                        }
                    </button>
                </div>
            )}

            {/* Success message after import */}
            {!parsedCards && message && (
                <p className={`text-sm font-bold text-center ${messageType === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {message}
                </p>
            )}

            <Link
                to={ROUTES.VOCAB_REVIEW}
                className="block w-full py-4 text-center text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200"
            >
                Quay lại thư viện
            </Link>
        </div>
    );
};

export default ImportScreen;

