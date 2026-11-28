import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Eye, EyeOff, Wand2, Underline, Bold, Trash2, Check, Loader2 } from 'lucide-react';
import { extractUnderlineTargetsFromQuestions, injectUnderlinesIntoHtml } from '../../utils/jlptExplanationParser';

/**
 * Modal allowing Admin to edit shared reading passage HTML directly inside an exam or review screen,
 * with quick `<u>` underline toggling, auto-underline sync from questions, and live preview.
 */
const ReadingPassageEditModal = ({
    isOpen,
    onClose,
    initialPassageHtml = '',
    clusterQuestions = [],
    questionRangeLabel = '',
    onSave
}) => {
    const [draftHtml, setDraftHtml] = useState(initialPassageHtml || '');
    const [showPreview, setShowPreview] = useState(true);
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setDraftHtml(initialPassageHtml || '');
            setSaving(false);
        }
    }, [isOpen, initialPassageHtml]);

    const questionTargets = useMemo(
        () => extractUnderlineTargetsFromQuestions(clusterQuestions, draftHtml),
        [clusterQuestions, draftHtml]
    );

    if (!isOpen) return null;

    const wrapSelection = (startTag, endTag) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const val = el.value;
        const selected = val.substring(start, end);

        // Toggle <u>...</u> if the user selected already-wrapped text or directly wraps <u>...</u>
        if (startTag === '<u>' && selected.startsWith('<u>') && selected.endsWith('</u>')) {
            const unwrapped = selected.slice(3, -4);
            const nextVal = val.substring(0, start) + unwrapped + val.substring(end);
            setDraftHtml(nextVal);
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start, start + unwrapped.length);
            }, 0);
            return;
        }

        const replacement = startTag + selected + endTag;
        const nextVal = val.substring(0, start) + replacement + val.substring(end);
        setDraftHtml(nextVal);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + startTag.length, start + startTag.length + selected.length);
        }, 0);
    };

    const handleAutoSyncUnderlines = () => {
        if (!questionTargets.length) return;
        setDraftHtml((prev) => injectUnderlinesIntoHtml(prev, questionTargets));
    };

    const handleStripAllUnderlines = () => {
        setDraftHtml((prev) => String(prev || '').replace(/<\/?u>/gi, ''));
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (saving || !onSave) return;
        setSaving(true);
        try {
            const ok = await onSave(draftHtml);
            if (ok !== false) onClose?.();
        } finally {
            setSaving(false);
        }
    };

    const modalNode = (
        <div className="fixed inset-0 z-[100080] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-sans">
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-800 my-auto text-left"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90 gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 px-2 py-0.5 rounded-md">
                                Admin Editor
                            </span>
                            {questionRangeLabel && (
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {questionRangeLabel}
                                </span>
                            )}
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                            <BookOpen className="w-4.5 h-4.5 text-emerald-500" />
                            <span>Chỉnh sửa bài đọc &amp; phần gạch chân</span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview((p) => !p)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                showPreview
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showPreview ? 'Ẩn xem trước' : 'Xem trước'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                    {questionTargets.length > 0 && (
                        <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-black text-sky-800 dark:text-sky-300">Cụm gạch chân ở câu hỏi:</span>
                                {questionTargets.map((t) => (
                                    <span key={t} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-700 font-japanese font-bold text-slate-800 dark:text-slate-200">
                                        {t}
                                    </span>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAutoSyncUnderlines}
                                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 active:translate-y-0.5 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                            >
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>Tự động gạch vào bài</span>
                            </button>
                        </div>
                    )}

                    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                        {/* Formatting Toolbar */}
                        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => wrapSelection('<u>', '</u>')}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-300 dark:border-slate-600 text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 cursor-pointer"
                                title="Bôi đen chữ cần gạch rồi bấm (hoặc bấm lại để bỏ gạch)"
                            >
                                <Underline className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Gạch chân &lt;u&gt;</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => wrapSelection('<b>', '</b>')}
                                className="px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                                title="In đậm"
                            >
                                <Bold className="w-3.5 h-3.5" />
                                <span>Đậm</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => wrapSelection('<ruby>', '<rt>よみ</rt></ruby>')}
                                className="px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer"
                                title="Chèn Furigana"
                            >
                                Ruby
                            </button>
                            <button
                                type="button"
                                onClick={() => wrapSelection('<br/>', '')}
                                className="px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-sky-600 dark:text-sky-400 cursor-pointer"
                                title="Xuống dòng"
                            >
                                &lt;br/&gt;
                            </button>
                            <button
                                type="button"
                                onClick={handleStripAllUnderlines}
                                className="ml-auto px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 cursor-pointer"
                                title="Xóa toàn bộ thẻ <u>...</u> trong bài đọc"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Bỏ hết gạch chân</span>
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={draftHtml}
                            onChange={(e) => setDraftHtml(e.target.value)}
                            rows={9}
                            placeholder="Bôi đen cụm từ cần gạch chân rồi bấm 'Gạch chân <u>' hoặc nhập HTML..."
                            className="w-full p-4 text-sm sm:text-base font-japanese leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0 resize-y"
                        />
                    </div>

                    {showPreview && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Xem trước hiển thị trên đề thi:
                            </span>
                            <div
                                className="font-japanese text-[15px] sm:text-[17px] leading-loose text-slate-900 dark:text-slate-100 whitespace-pre-line [&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-4"
                                dangerouslySetInnerHTML={{ __html: draftHtml }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/90">
                    <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                        Áp dụng đồng thời cho tất cả câu hỏi dùng chung bài đọc này.
                    </span>
                    <div className="flex items-center gap-2.5 ml-auto">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 disabled:opacity-60 text-white flex items-center gap-1.5 cursor-pointer"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                            <span>{saving ? 'Đang lưu...' : 'Lưu bài đọc'}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

export default ReadingPassageEditModal;
