import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Loader2, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../router';

const ImportScreen = ({ onImport }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [message, setMessage] = useState('');

    const handleFileParse = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsLoading(true);
        setMessage('');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvText = event.target.result;
                const lines = csvText.split('\n');
                const cardsToImport = [];
                let validCount = 0;
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

                    const card = {
                        front: fields[0],
                        back: fields[1],
                        synonym: fields[2] || '',
                        example: fields[3] || '',
                        exampleMeaning: fields[4] || '',
                        nuance: fields[5] || '',
                        createdAtRaw: fields[6] || ''
                    };

                    // Parse SRS fields if available
                    if (fields.length >= 15) {
                        let srsIndex = 7;
                        card.intervalIndex_back = parseInt(fields[srsIndex++]) || -1;
                        card.correctStreak_back = parseInt(fields[srsIndex++]) || 0;
                        card.nextReview_back_timestamp = parseInt(fields[srsIndex++]) || Date.now();
                        card.intervalIndex_synonym = parseInt(fields[srsIndex++]) || -999;
                        card.correctStreak_synonym = parseInt(fields[srsIndex++]) || 0;
                        card.nextReview_synonym_timestamp = parseInt(fields[srsIndex++]) || new Date(9999, 0, 1).getTime();
                        card.intervalIndex_example = parseInt(fields[srsIndex++]) || -999;
                        card.correctStreak_example = parseInt(fields[srsIndex++]) || 0;
                        card.nextReview_example_timestamp = parseInt(fields[srsIndex++]) || new Date(9999, 0, 1).getTime();

                        if (fields[16]) card.audioBase64 = fields[16];
                        if (fields[17]) card.imageBase64 = fields[17];
                        if (fields[18]) card.pos = fields[18];
                        if (fields[19]) card.level = fields[19];
                        if (fields[20]) card.sinoVietnamese = fields[20];
                        if (fields[21]) card.synonymSinoVietnamese = fields[21];
                    } else {
                        card.intervalIndex_back = -1;
                        card.nextReview_back_timestamp = Date.now();
                    }

                    cardsToImport.push(card);
                    validCount++;
                });

                if (cardsToImport.length > 0) {
                    await onImport(cardsToImport);
                    const messageText = invalidCount > 0
                        ? `Thành công: ${validCount} thẻ. ${invalidCount} dòng lỗi đã bỏ qua.`
                        : `Thành công: ${validCount} thẻ.`;
                    setMessage(messageText);
                } else {
                    setMessage("File lỗi hoặc rỗng.");
                    setIsLoading(false);
                }
            } catch (error) {
                console.error(error);
                setMessage("Lỗi đọc file.");
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <Link
                    to={ROUTES.VOCABULARY}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                    title="Quay lại danh sách từ vựng"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Nhập Dữ Liệu
                </h2>
            </div>

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
                {fileName && <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">{fileName}</p>}
                {isLoading && <Loader2 className="animate-spin mt-4 text-indigo-500 dark:text-indigo-400" />}
                {message && <p className="mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">{message}</p>}
            </div>

            <Link
                to={ROUTES.VOCABULARY}
                className="block w-full py-4 text-center text-gray-500 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200"
            >
                Quay lại danh sách từ vựng
            </Link>
        </div>
    );
};

export default ImportScreen;
