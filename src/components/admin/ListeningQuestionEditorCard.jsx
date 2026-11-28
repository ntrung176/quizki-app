import React, { useState } from 'react';
import {
    ChevronDown, ChevronUp, Crop, Image as ImageIcon, Plus, Trash2,
    CheckCircle2, Scissors, MessageSquareText, Wand2
} from 'lucide-react';
import ListeningAudioPlayer from '../jlptTest/ListeningAudioPlayer';
import AiImageRecreatorModal from './AiImageRecreatorModal';
import { getMondaiListForLevel } from '../jlptTest/jlptYearlyConstants';
import { compressImage } from '../../utils/image';
import { uploadBase64ImageToStorage } from '../../utils/jlptAudioProcessor';

/**
 * Modular question editor card for JLPT Listening Studio.
 */
const ListeningQuestionEditorCard = ({
    question,
    index,
    level = 'N3',
    hasPdfVisuals = false,
    storagePrefix = 'jlpt_images/custom',
    onChange,
    onDelete,
    onOpenPdfCropper
}) => {
    const [expanded, setExpanded] = useState(index < 2);
    const [playerTime, setPlayerTime] = useState(0);
    const [showAiImageModal, setShowAiImageModal] = useState(false);
    const mondaiOptions = getMondaiListForLevel(level);

    const updateField = (field, val) => {
        onChange({ ...question, [field]: val });
    };

    const updateOption = (optIdx, val) => {
        const nextOpts = [...(question.options || ['1', '2', '3', '4'])];
        nextOpts[optIdx] = val;
        updateField('options', nextOpts);
    };

    const updateScriptLine = (lineIdx, field, val) => {
        const nextScript = [...(question.script || [])];
        nextScript[lineIdx] = { ...(nextScript[lineIdx] || { speaker: 'M', ja: '', vi: '' }), [field]: val };
        updateField('script', nextScript);
    };

    const addScriptLine = () => {
        const nextScript = [...(question.script || []), { speaker: 'F', ja: '', vi: '' }];
        updateField('script', nextScript);
    };

    const removeScriptLine = (lineIdx) => {
        const nextScript = (question.script || []).filter((_, i) => i !== lineIdx);
        updateField('script', nextScript);
    };

    const handleLocalImageUpload = async (file) => {
        if (!file) return;
        const compressed = await compressImage(file, 960, 960, 0.85);
        try {
            const url = await uploadBase64ImageToStorage(compressed, `${storagePrefix}/q_${index + 1}_${Date.now()}.jpg`);
            updateField('imageUrl', url);
        } catch {
            updateField('imageUrl', compressed);
        }
    };

    const mNum = Number(question.mondai || 1);
    const shiftTime = (field, delta) => {
        const base = typeof question[field] === 'number' ? question[field] : 0;
        updateField(field, Math.max(0, Number((base + delta).toFixed(1))));
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-2xs">
            {/* Collapsed Header */}
            <div
                onClick={() => setExpanded((e) => !e)}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-black shrink-0">
                        M{mNum} · Câu {question.questionNumber || index + 1}
                    </span>
                    {question.imageUrl && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold shrink-0">
                            Có ảnh
                        </span>
                    )}
                    {typeof question.audioStartSec === 'number' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                            {question.audioStartSec}s–{question.audioEndSec ?? '?'}s
                        </span>
                    )}
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                        {(question.stem || question.question || '').replace(/<[^>]+>/g, ' ')}
                    </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Xóa câu này"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                    {/* Meta + Audio Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Thuộc Mondai ({level})</label>
                            <select
                                value={mNum}
                                onChange={(e) => {
                                    const nextM = Number(e.target.value);
                                    const found = mondaiOptions.find((m) => m.mondai === nextM);
                                    onChange({
                                        ...question,
                                        mondai: nextM,
                                        mondaiTitle: found ? `Mondai ${nextM}: ${found.ja} · ${found.vi}` : `Mondai ${nextM}`
                                    });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                            >
                                {mondaiOptions.map((m) => (
                                    <option key={m.mondai} value={m.mondai}>
                                        Mondai {m.mondai}: {m.ja} ({m.vi})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Số câu (STT)</label>
                            <input
                                type="number"
                                min={1}
                                value={question.questionNumber || index + 1}
                                onChange={(e) => updateField('questionNumber', Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">URL Audio MP3</label>
                            <input
                                type="text"
                                value={question.audioUrl || ''}
                                onChange={(e) => updateField('audioUrl', e.target.value)}
                                placeholder="https://... hoặc /audio/jlpt/..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Segment Player + Timestamp Nudge */}
                    {question.audioUrl && (
                        <div className="space-y-2">
                            <ListeningAudioPlayer
                                src={question.audioUrl}
                                startSec={question.audioStartSec}
                                endSec={question.audioEndSec}
                                compact
                                label={`Kiểm tra đoạn audio Câu ${question.questionNumber || index + 1}`}
                                onTimeReport={setPlayerTime}
                            />

                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                                    <Scissors className="w-3 h-3 text-emerald-500" />
                                    <span className="font-bold text-slate-500">Bắt đầu (s):</span>
                                    <button type="button" onClick={() => shiftTime('audioStartSec', -0.5)} className="px-1.5 font-black hover:text-emerald-600 cursor-pointer">-0.5</button>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={question.audioStartSec ?? ''}
                                        onChange={(e) => updateField('audioStartSec', e.target.value === '' ? undefined : Number(e.target.value))}
                                        className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center"
                                    />
                                    <button type="button" onClick={() => shiftTime('audioStartSec', 0.5)} className="px-1.5 font-black hover:text-emerald-600 cursor-pointer">+0.5</button>
                                    <button
                                        type="button"
                                        onClick={() => updateField('audioStartSec', Number(playerTime.toFixed(1)))}
                                        className="ml-1 px-2 py-0.5 rounded bg-emerald-500 text-white font-bold cursor-pointer"
                                    >
                                        Gắn mốc ({playerTime.toFixed(1)}s)
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                                    <span className="font-bold text-slate-500">Kết thúc (s):</span>
                                    <button type="button" onClick={() => shiftTime('audioEndSec', -0.5)} className="px-1.5 font-black hover:text-emerald-600 cursor-pointer">-0.5</button>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={question.audioEndSec ?? ''}
                                        onChange={(e) => updateField('audioEndSec', e.target.value === '' ? undefined : Number(e.target.value))}
                                        className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center"
                                    />
                                    <button type="button" onClick={() => shiftTime('audioEndSec', 0.5)} className="px-1.5 font-black hover:text-emerald-600 cursor-pointer">+0.5</button>
                                    <button
                                        type="button"
                                        onClick={() => updateField('audioEndSec', Number(playerTime.toFixed(1)))}
                                        className="ml-1 px-2 py-0.5 rounded bg-sky-500 text-white font-bold cursor-pointer"
                                    >
                                        Gắn mốc ({playerTime.toFixed(1)}s)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image Attachment & PDF Cropper */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-sky-500" />
                                Hình minh họa câu hỏi {question.hasIllustrationNote ? '(Câu này có tranh vẽ)' : '(tùy chọn)'}
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                                {hasPdfVisuals && (
                                    <button
                                        type="button"
                                        onClick={onOpenPdfCropper}
                                        className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                    >
                                        <Crop className="w-3.5 h-3.5" />
                                        <span>Cắt từ PDF đề nghe</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowAiImageModal(true)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                    title="Chụp ảnh từ đề, dán Ctrl+V và vẽ lại bằng AI cho đẹp"
                                >
                                    <Wand2 className="w-3.5 h-3.5" />
                                    <span>Dán &amp; Vẽ lại AI</span>
                                </button>
                                <label className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer hover:bg-slate-100">
                                    <span>Chọn ảnh máy</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleLocalImageUpload(e.target.files?.[0])}
                                    />
                                </label>
                                {question.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => updateField('imageUrl', '')}
                                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer"
                                    >
                                        Gỡ ảnh
                                    </button>
                                )}
                            </div>
                        </div>

                        {question.imageUrl && (
                            <img src={question.imageUrl} alt="Preview" className="max-h-44 rounded-xl border border-slate-200 bg-white p-1 object-contain" />
                        )}
                    </div>

                    {/* Question Prompt & Options */}
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                                    Ngữ cảnh trong Audio (stem — ẩn khi đang làm bài)
                                </label>
                                <input
                                    type="text"
                                    value={question.stem || ''}
                                    onChange={(e) => updateField('stem', e.target.value)}
                                    placeholder="VD: 大学で男の人と女の人が話しています。"
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-japanese text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                                    Câu hỏi trong Audio (hiện trong Giải thích/Script)
                                </label>
                                <input
                                    type="text"
                                    value={question.spokenQuestion || ''}
                                    onChange={(e) => updateField('spokenQuestion', e.target.value)}
                                    placeholder="VD: 女の人はこの後何をしますか。"
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-japanese text-slate-800 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <label className="block text-[10px] font-black uppercase text-slate-400">
                                Đề / Bảng biểu in trên giấy (mặc định {question.questionNumber || index + 1}番)
                            </label>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                <span className="text-slate-400">Số đáp án:</span>
                                {[3, 4].map((cnt) => (
                                    <button
                                        key={cnt}
                                        type="button"
                                        onClick={() => {
                                            const cur = [...(question.options || ['1', '2', '3', '4'])];
                                            const nextOpts = cnt === 3
                                                ? cur.slice(0, 3)
                                                : [cur[0] || '1', cur[1] || '2', cur[2] || '3', cur[3] || '4'];
                                            const nextAns = Math.min(question.correctAnswer || 0, nextOpts.length - 1);
                                            onChange({ ...question, options: nextOpts, correctAnswer: nextAns, answer: nextAns });
                                        }}
                                        className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                                            (question.options?.length || 4) === cnt
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {cnt} đáp án
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            rows={1}
                            value={question.paperPrompt || ''}
                            onChange={(e) => onChange({
                                ...question,
                                paperPrompt: e.target.value,
                                question: e.target.value.trim() || `${question.questionNumber || index + 1}番`
                            })}
                            placeholder="Để trống nếu tờ đề chỉ in số câu & lựa chọn/tranh..."
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-japanese text-slate-800 dark:text-white"
                        />

                        <div className="grid grid-cols-1 gap-2">
                            {(question.options || ['1', '2', '3', '4']).map((opt, oi) => (
                                <div
                                    key={oi}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                                        question.correctAnswer === oi
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        checked={question.correctAnswer === oi}
                                        onChange={() => onChange({ ...question, correctAnswer: oi, answer: oi })}
                                        className="accent-emerald-500 cursor-pointer"
                                    />
                                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                        {oi + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOption(oi, e.target.value)}
                                        className="flex-1 bg-transparent text-xs font-japanese text-slate-800 dark:text-white outline-none"
                                    />
                                    {question.correctAnswer === oi && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bilingual Script Lines */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                                <MessageSquareText className="w-3.5 h-3.5 text-emerald-500" />
                                Script Hội Thoại Song Ngữ ({(question.script || []).length} dòng)
                            </span>
                            <button
                                type="button"
                                onClick={addScriptLine}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-3 h-3" /> Thêm câu thoại
                            </button>
                        </div>

                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            {(question.script || []).map((line, lIdx) => (
                                <div key={lIdx} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800">
                                    <select
                                        value={line.speaker || 'M'}
                                        onChange={(e) => updateScriptLine(lIdx, 'speaker', e.target.value)}
                                        className="col-span-2 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-black"
                                    >
                                        <option value="Narrator">Dẫn</option>
                                        <option value="M">Nam</option>
                                        <option value="F">Nữ</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={line.ja || ''}
                                        onChange={(e) => updateScriptLine(lIdx, 'ja', e.target.value)}
                                        placeholder="Lời thoại tiếng Nhật"
                                        className="col-span-5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-japanese"
                                    />
                                    <input
                                        type="text"
                                        value={line.vi || ''}
                                        onChange={(e) => updateScriptLine(lIdx, 'vi', e.target.value)}
                                        placeholder="Dịch tiếng Việt"
                                        className="col-span-4 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeScriptLine(lIdx)}
                                        className="col-span-1 flex justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Giải thích chi tiết</label>
                        <textarea
                            rows={2}
                            value={question.explanation || ''}
                            onChange={(e) => updateField('explanation', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white"
                        />
                    </div>
                </div>
            )}
            {showAiImageModal && (
                <AiImageRecreatorModal
                    isOpen={showAiImageModal}
                    onClose={() => setShowAiImageModal(false)}
                    storagePrefix={storagePrefix}
                    questionLabel={`M${mNum} · Câu ${question.questionNumber || index + 1}`}
                    existingImageUrl={question.imageUrl || ''}
                    onSaveImage={(url) => updateField('imageUrl', url)}
                />
            )}
        </div>
    );
};

export default ListeningQuestionEditorCard;
