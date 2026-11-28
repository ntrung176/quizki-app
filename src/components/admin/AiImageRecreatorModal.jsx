import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, Upload, ClipboardPaste, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { recreateIllustrationWithAI } from '../../services/ai/jlptImageRecreatorService';
import { uploadBase64ImageToStorage } from '../../utils/jlptAudioProcessor';
import { compressImage } from '../../utils/image';
import { showToast } from '../../utils/toast';

/**
 * Paste screenshot of a JLPT illustration -> Recreate cleanly with AI -> Save to Storage & attach to question.
 */
const AiImageRecreatorModal = ({
    isOpen,
    onClose,
    storagePrefix = 'jlpt_images/custom',
    questionLabel = '',
    existingImageUrl = '',
    onSaveImage = () => {}
}) => {
    const [refDataUrl, setRefDataUrl] = useState('');
    const [generatedDataUrl, setGeneratedDataUrl] = useState('');
    const [genMethod, setGenMethod] = useState('');
    const [stylePreset, setStylePreset] = useState('textbook'); // 'textbook' | 'colored' | 'diagram'
    const [customNote, setCustomNote] = useState('');
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setRefDataUrl('');
        setGeneratedDataUrl('');
        setGenMethod('');
        setCustomNote('');
    }, [isOpen]);

    // Global Ctrl+V paste listener while modal is open
    useEffect(() => {
        if (!isOpen) return undefined;
        const onPaste = async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type?.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        try {
                            const compressed = await compressImage(file, 1100, 1100, 0.9);
                            setRefDataUrl(compressed);
                            setGeneratedDataUrl('');
                        } catch {
                            showToast('Không đọc được ảnh từ clipboard.', 'error');
                        }
                        break;
                    }
                }
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [isOpen]);

    const handlePickFile = async (file) => {
        if (!file) return;
        try {
            const compressed = await compressImage(file, 1100, 1100, 0.9);
            setRefDataUrl(compressed);
            setGeneratedDataUrl('');
        } catch {
            showToast('Không đọc được file ảnh này.', 'error');
        }
    };

    const handleRecreate = async () => {
        if (!refDataUrl) return showToast('Hãy chụp màn hình rồi nhấn Ctrl+V dán ảnh gốc vào trước.', 'warning');
        setGenerating(true);
        try {
            const res = await recreateIllustrationWithAI({
                referenceDataUrl: refDataUrl,
                stylePreset,
                customNote
            });
            setGeneratedDataUrl(res.dataUrl);
            setGenMethod(res.method);
            showToast('Đã vẽ lại ảnh minh họa siêu nét bằng AI!', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveAndAttach = async (useOriginalInstead = false) => {
        const targetDataUrl = useOriginalInstead ? refDataUrl : (generatedDataUrl || refDataUrl);
        if (!targetDataUrl) return;
        setSaving(true);
        try {
            const path = `${storagePrefix}/ai_img_${Date.now()}.png`;
            const url = await uploadBase64ImageToStorage(targetDataUrl, path);
            await onSaveImage(url);
            showToast('Đã lưu ảnh & gắn trực tiếp vào câu hỏi!', 'success');
            onClose();
        } catch {
            await onSaveImage(targetDataUrl);
            showToast('Đã gắn ảnh trực tiếp vào câu hỏi.', 'info');
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                            <Wand2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                Dán Ảnh Đề &amp; Vẽ Lại Bằng AI {questionLabel ? `· ${questionLabel}` : ''}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> dán thẳng ảnh chụp màn hình từ đề → AI vẽ lại sắc nét → Lưu gắn vào câu.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 space-y-4">
                    {/* Paste & File Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'textbook', label: 'Nét đen trắng chuẩn JLPT' },
                                { id: 'colored', label: 'Minh họa màu dịu' },
                                { id: 'diagram', label: 'Biểu đồ / Bản đồ nét đậm' }
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setStylePreset(st.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer ${
                                        stylePreset === st.id
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        <label className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Chọn ảnh từ máy</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePickFile(e.target.files?.[0])}
                            />
                        </label>
                    </div>

                    {/* Side-by-side Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3 flex flex-col items-center justify-center min-h-[210px] space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-400">1. Ảnh chụp gốc (Ctrl+V vào đây)</span>
                            {refDataUrl ? (
                                <img src={refDataUrl} alt="Ảnh chụp gốc" className="max-h-52 rounded-xl object-contain bg-white p-1 border border-slate-200" />
                            ) : existingImageUrl ? (
                                <div className="text-center space-y-1.5">
                                    <img src={existingImageUrl} alt="Ảnh hiện tại" className="max-h-36 rounded-xl object-contain bg-white p-1 mx-auto opacity-75" />
                                    <p className="text-[11px] text-slate-400 font-semibold">Bấm Ctrl+V để dán ảnh chụp mới</p>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 space-y-1.5 px-4">
                                    <ClipboardPaste className="w-8 h-8 mx-auto text-sky-500/70" />
                                    <p className="text-xs font-bold">Chụp màn hình tranh trong PDF rồi bấm Ctrl+V</p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/15 p-3 flex flex-col items-center justify-center min-h-[210px] space-y-2">
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                2. Ảnh AI vẽ lại {genMethod ? `(${genMethod === 'raster_ai' ? 'Image AI' : 'Vector nét'})` : ''}
                            </span>
                            {generating ? (
                                <div className="text-center space-y-2 text-emerald-600">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                                    <p className="text-xs font-black">AI đang vẽ lại tranh siêu nét...</p>
                                </div>
                            ) : generatedDataUrl ? (
                                <img src={generatedDataUrl} alt="Ảnh AI vẽ lại" className="max-h-52 rounded-xl object-contain bg-white p-1 border border-emerald-200 shadow-xs" />
                            ) : (
                                <p className="text-xs font-bold text-slate-400 text-center px-4">
                                    Bấm &quot;Tạo lại bằng AI&quot; bên dưới để xem bản vẽ đẹp trước khi gắn vào đề
                                </p>
                            )}
                        </div>
                    </div>

                    <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Ghi chú thêm cho AI (tuỳ chọn: vd 'Giữ đúng 4 khung 1 2 3 4 chỉ mũi tên sang phải, bỏ chữ thừa ở góc')..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white"
                    />
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={!refDataUrl || generating}
                            onClick={handleRecreate}
                            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 disabled:opacity-45 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (generatedDataUrl ? <RefreshCw className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />)}
                            <span>{generatedDataUrl ? 'Vẽ lại lần nữa' : 'Tạo lại bằng AI cho đẹp'}</span>
                        </button>

                        {refDataUrl && !generatedDataUrl && (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSaveAndAttach(true)}
                                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                            >
                                Dùng ảnh gốc luôn
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            disabled={(!generatedDataUrl && !refDataUrl) || saving}
                            onClick={() => handleSaveAndAttach(false)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 disabled:opacity-45 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Lưu &amp; Gắn vào đề</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AiImageRecreatorModal;
