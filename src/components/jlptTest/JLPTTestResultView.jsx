import React from 'react';
import { 
    Award, AlertTriangle, FileText, X, Settings, Check, 
    Maximize, Minimize, ChevronLeft, ChevronRight, Edit3, 
    CheckCircle, XCircle, Pencil 
} from 'lucide-react';
import QuestionContent from './QuestionContent';
import QuestionEditModal from './QuestionEditModal';
import HandwritingCanvas from '../ui/HandwritingCanvas';
import ExamAnnotationOverlay from '../screens/ExamAnnotationOverlay';
import { SECTION_ICONS, SECTION_COLORS } from './jlptConstants';

const JLPTTestResultView = ({
    activeTest,
    showDetailedReview,
    setShowDetailedReview,
    currentSectionIdx,
    currentQuestionIdx,
    answers,
    results,
    passed,
    wasRealExam,
    timeTaken,
    formatTime,
    exitTest,
    startTest,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    canEdit,
    handleToggleTestFixed,
    showSettingsMenu,
    setShowSettingsMenu,
    settingsMenuRef,
    showFurigana,
    setShowFurigana,
    furiganaColor,
    setFuriganaColor,
    furiganaStyleElement,
    isFullscreen,
    toggleFullscreen,
    containerRef,
    // Notes states
    notes,
    editingReviewNoteKey,
    setEditingReviewNoteKey,
    reviewNoteDraft,
    setReviewNoteDraft,
    reviewNoteTab,
    setReviewNoteTab,
    reviewDrawDraftStrokes,
    setReviewDrawDraftStrokes,
    reviewDrawDraftDataUrl,
    setReviewDrawDraftDataUrl,
    saveNotesMultiple,
    deleteNotesMultiple,
    // Admin Edit modal
    editingQuestionData,
    setEditingQuestionData,
    handleSaveQuestionHtml
}) => {
    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

    const renderReviewNoteContainer = (si, qi) => {
        const noteKey = `${activeTest.id}_s${si}_q${qi}`;
        const drawKey = `${noteKey}_draw`;
        const strokesKey = `${noteKey}_strokes`;

        const questionNote = notes[noteKey];
        const questionDraw = notes[drawKey];
        const hasAnyReviewNote = !!questionNote || !!questionDraw;
        const isEditingThisReviewNote = editingReviewNoteKey === noteKey;

        return (
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 max-w-2xl font-sans">
                {isEditingThisReviewNote ? (
                    <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-250/50 dark:border-amber-900/40 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <Edit3 className="w-3.5 h-3.5" /> Ghi chú cho câu này
                            </span>
                            <button onClick={() => setEditingReviewNoteKey(null)} className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-200 dark:border-slate-850">
                            <button
                                type="button"
                                onClick={() => setReviewNoteTab('text')}
                                className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 border-b-2 transition-all ${
                                    reviewNoteTab === 'text'
                                        ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                                }`}
                            >
                                <Edit3 className="w-3 h-3" /> Ghi chú chữ
                            </button>
                            <button
                                type="button"
                                onClick={() => setReviewNoteTab('draw')}
                                className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 border-b-2 transition-all ${
                                    reviewNoteTab === 'draw'
                                        ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                                }`}
                            >
                                <Pencil className="w-3 h-3" /> Bản viết tay
                            </button>
                        </div>

                        {reviewNoteTab === 'text' ? (
                            <textarea
                                value={reviewNoteDraft}
                                onChange={(e) => setReviewNoteDraft(e.target.value)}
                                placeholder="Nhập ghi chú cho câu hỏi này..."
                                className="w-full min-h-[85px] p-2.5 border border-amber-250 dark:border-amber-800/60 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-sans"
                            />
                        ) : (
                            <div className="p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                <HandwritingCanvas
                                    initialStrokes={reviewDrawDraftStrokes}
                                    onChange={(strokes, dataUrl) => {
                                        setReviewDrawDraftStrokes(strokes);
                                        setReviewDrawDraftDataUrl(dataUrl);
                                    }}
                                    darkMode={document.documentElement.classList.contains('dark')}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                            <button 
                                type="button"
                                onClick={() => setEditingReviewNoteKey(null)}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    const updates = {};
                                    const deletes = [];
                                    if (reviewNoteDraft.trim()) { updates[noteKey] = reviewNoteDraft; } else { deletes.push(noteKey); }
                                    if (reviewDrawDraftDataUrl) { updates[drawKey] = reviewDrawDraftDataUrl; updates[strokesKey] = reviewDrawDraftStrokes; } else { deletes.push(drawKey); deletes.push(strokesKey); }
                                    if (Object.keys(updates).length > 0) { saveNotesMultiple(updates); }
                                    if (deletes.length > 0) { deleteNotesMultiple(deletes); }
                                    setEditingReviewNoteKey(null);
                                }}
                                className="px-3.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition shadow-sm"
                            >
                                Lưu ghi chú
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {hasAnyReviewNote ? (
                            <div className="bg-rose-50/60 dark:bg-rose-950/15 border border-dashed border-rose-300 dark:border-rose-900/40 rounded-xl p-3.5 shadow-sm relative animate-fade-in">
                                <div className="flex items-center justify-between border-b border-rose-200/40 dark:border-rose-900/20 pb-2 mb-2">
                                    <span className="text-rose-700 dark:text-rose-455 font-extrabold text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="text-sm">✍️</span> Lời phê / Sửa bài
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                setReviewNoteDraft(questionNote || '');
                                                let strokes = [];
                                                try { strokes = notes[strokesKey] || []; } catch (e) {}
                                                setReviewDrawDraftStrokes(strokes);
                                                setReviewDrawDraftDataUrl(questionDraw || '');
                                                setReviewNoteTab(questionDraw ? 'draw' : 'text');
                                                setEditingReviewNoteKey(noteKey);
                                            }} 
                                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 transition"
                                            title="Sửa ghi chú"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                const ok = await window.showConfirm("Bạn có muốn xóa ghi chú sửa bài này?", { type: 'danger' });
                                                if (ok) { deleteNotesMultiple([noteKey, drawKey, strokesKey]); }
                                            }} 
                                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition"
                                            title="Xóa ghi chú"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3.5">
                                    {questionNote && (
                                        <p className="text-sm text-rose-800 dark:text-rose-300 font-serif italic whitespace-pre-line leading-relaxed pl-1 border-l-2 border-rose-300/40">
                                            "{questionNote}"
                                        </p>
                                    )}
                                    {questionDraw && (
                                        <div className="flex justify-center bg-rose-50/20 dark:bg-rose-950/5 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30 shadow-inner">
                                            <img 
                                                src={questionDraw} 
                                                alt="Sửa bài viết tay" 
                                                className="max-h-40 object-contain dark:invert-[0.1]" 
                                                style={{ filter: 'hue-rotate(330deg) saturate(1.5)' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => {
                                    setReviewNoteDraft('');
                                    setReviewDrawDraftStrokes([]);
                                    setReviewDrawDraftDataUrl('');
                                    setReviewNoteTab('text');
                                    setEditingReviewNoteKey(noteKey);
                                }}
                                className="py-1.5 px-3 border border-dashed border-rose-250 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-lg flex items-center gap-1.5 text-rose-650 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-bold text-[10px] transition cursor-pointer select-none"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> Viết lời phê / Sửa đề
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (showDetailedReview) {
        const section = activeTest.sections[currentSectionIdx];
        const question = section?.questions?.[currentQuestionIdx];

        let totalQ = 0;
        let correctCount = 0;
        activeTest.sections.forEach((sec, si) => {
            sec.questions.forEach((q, qi) => {
                if (q.subQuestions && q.subQuestions.length > 0) {
                    q.subQuestions.forEach((sq, sqi) => {
                        totalQ++;
                        if (answers[subAnswerKey(si, qi, sqi)] === sq.correctAnswer) { correctCount++; }
                    });
                } else {
                    totalQ++;
                    if (answers[answerKey(si, qi)] === q.correctAnswer) { correctCount++; }
                }
            });
        });

        const globalIdx = activeTest.sections.slice(0, currentSectionIdx).reduce((s, sec) => s + sec.questions.length, 0) + currentQuestionIdx;
        const isLast = currentSectionIdx === activeTest.sections.length - 1 && currentQuestionIdx === section.questions.length - 1;
        const isFirst = currentSectionIdx === 0 && currentQuestionIdx === 0;

        return (
            <div ref={containerRef} className={`min-h-screen flex flex-col ${isFullscreen ? 'bg-white dark:bg-gray-900 h-screen overflow-hidden' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20'}`}>
                {furiganaStyleElement}
                {/* Top bar */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-4 py-2 font-sans">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowDetailedReview(false)} className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex items-center gap-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg cursor-pointer">
                                <X className="w-4 h-4" />
                                <span>Thoát xem lại</span>
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">{activeTest.title} (Xem lại đáp án)</p>
                                    {canEdit && (
                                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-bold text-emerald-650 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-200/30 transition shrink-0 select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={!!activeTest.isFixed} 
                                                onChange={(e) => handleToggleTestFixed(e, activeTest)}
                                                className="w-3.5 h-3.5 rounded border-emerald-350 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            <span>Đã sửa đề</span>
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">{section?.title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">{correctCount}/{totalQ} câu đúng ({results.percentage}%)</span>
                            <div className="relative" ref={settingsMenuRef}>
                                <button onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                    className={`p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-305 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${showSettingsMenu ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                                    title="Cài đặt hiển thị">
                                    <Settings className="w-5 h-5" />
                                </button>
                                {showSettingsMenu && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white/98 dark:bg-slate-800/98 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 z-50 text-left space-y-4 font-sans">
                                        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                                            <Settings className="w-4 h-4 text-indigo-500" />
                                            <span className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Cài đặt đề thi</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Hiển thị Furigana</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">Bật/tắt phiên âm chữ Hán</p>
                                            </div>
                                            <button 
                                                onClick={() => setShowFurigana(!showFurigana)} 
                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showFurigana ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showFurigana ? 'translate-x-5.5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        {showFurigana && (
                                            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Màu chữ Furigana</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Chọn màu cho phiên âm</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {[
                                                        { id: 'default', color: '', label: 'Mặc định', bgClass: 'bg-slate-400 dark:bg-slate-500 border border-slate-300 dark:border-slate-600' },
                                                        { id: 'red', color: '#EF4444', label: 'Đỏ', bgClass: 'bg-red-500' },
                                                        { id: 'blue', color: '#3B82F6', label: 'Xanh', bgClass: 'bg-blue-500' },
                                                        { id: 'green', color: '#10B981', label: 'Lá', bgClass: 'bg-emerald-500' },
                                                        { id: 'sky', color: '#0EA5E9', label: 'Xanh trời', bgClass: 'bg-sky-500' },
                                                        { id: 'orange', color: '#F59E0B', label: 'Cam', bgClass: 'bg-amber-500' }
                                                    ].map(colorOpt => {
                                                        const isSelected = furiganaColor === colorOpt.id;
                                                        return (
                                                            <button
                                                                key={colorOpt.id}
                                                                onClick={() => setFuriganaColor(colorOpt.id)}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 cursor-pointer ${colorOpt.bgClass} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800 scale-105' : 'opacity-85'}`}
                                                                title={colorOpt.label}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button onClick={toggleFullscreen}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer">
                                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className={`flex-1 flex ${isFullscreen ? 'min-h-0 overflow-hidden' : ''}`}>
                    {/* Sidebar */}
                    <div className="hidden md:block w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto font-sans">
                        {activeTest.sections.map((sec, si) => {
                            const SIcon = SECTION_ICONS[sec.type] || FileText;
                            return (
                                <div key={si}>
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                        <SIcon className="w-3.5 h-3.5" /> {sec.title}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 p-2">
                                        {sec.questions.map((q, qi) => {
                                            const isActive = si === currentSectionIdx && qi === currentQuestionIdx;
                                            let isCorrect = false;
                                            if (q.subQuestions && q.subQuestions.length > 0) {
                                                isCorrect = q.subQuestions.every((sq, sqi) => answers[subAnswerKey(si, qi, sqi)] === sq.correctAnswer);
                                            } else {
                                                isCorrect = answers[answerKey(si, qi)] === q.correctAnswer;
                                            }

                                            return (
                                                <button key={qi} onClick={() => goToQuestion(si, qi)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                                        isActive
                                                            ? isCorrect
                                                                ? 'bg-green-600 text-white ring-2 ring-green-400 dark:ring-green-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md font-black scale-105'
                                                                : 'bg-red-600 text-white ring-2 ring-red-400 dark:ring-red-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md font-black scale-105'
                                                            : isCorrect
                                                                ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200/55 dark:border-green-900/50 hover:bg-green-200'
                                                                : 'bg-red-100 dark:bg-red-950/30 text-red-705 dark:text-red-400 border border-red-200/55 dark:border-red-900/50 hover:bg-red-200'
                                                    }`}>
                                                    {qi + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                            <button onClick={() => setShowDetailedReview(false)}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition cursor-pointer">
                                Quay lại bảng điểm
                            </button>
                        </div>
                    </div>
                    {/* Main Review Area */}
                    <div className="flex-1 p-4 md:p-8 overflow-y-auto relative font-sans" id="jlpt-main-scroll-container">
                        <ExamAnnotationOverlay
                            testId={activeTest.id}
                            sectionIdx={currentSectionIdx}
                            questionIdx={currentQuestionIdx}
                            isEnabled={false}
                            readOnly={true}
                        />
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold bg-${SECTION_COLORS[section?.type]}-100 dark:bg-${SECTION_COLORS[section?.type]}-900/30 text-${SECTION_COLORS[section?.type]}-700 dark:text-${SECTION_COLORS[section?.type]}-400`}>
                                    {section?.title}
                                </span>
                                <span className="text-sm text-gray-500">Câu {currentQuestionIdx + 1}/{section?.questions?.length}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
                                <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${((globalIdx + 1) / totalQ) * 100}%` }} />
                            </div>
                            <div className="relative w-full" id="jlpt-question-content-wrapper">
                                <QuestionContent
                                    section={section}
                                    question={question}
                                    answers={answers}
                                    currentSectionIdx={currentSectionIdx}
                                    currentQuestionIdx={currentQuestionIdx}
                                    selectAnswer={() => {}}
                                    selectAnswerSub={() => {}}
                                    isRealExam={false}
                                    isReview={true}
                                    canEdit={canEdit}
                                    onEditQuestion={(q, sIdx, qIdx) => setEditingQuestionData({ question: q, sectionIdx: sIdx, questionIdx: qIdx })}
                                />
                            </div>
                            
                            {/* Note Section for Review */}
                            {activeTest && (
                                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 mb-8">
                                    {renderReviewNoteContainer(currentSectionIdx, currentQuestionIdx)}
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex items-center justify-between mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                                <button onClick={prevQuestion} disabled={isFirst}
                                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-sm border ${
                                        isFirst
                                            ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-350 dark:text-slate-650 border-slate-200/50 dark:border-slate-800/50 cursor-not-allowed'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:scale-[1.02] cursor-pointer'
                                    }`}>
                                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" /> Câu trước
                                </button>
                                <button onClick={() => setShowDetailedReview(false)}
                                    className="md:hidden px-5 py-2.5 bg-[#2E5B70] text-white rounded-xl text-sm font-bold hover:bg-[#254A5C] transition active:scale-95 shadow-md">
                                    Bảng điểm
                                </button>
                                <button onClick={nextQuestion} disabled={isLast}
                                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-md ${
                                        isLast
                                            ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-350 dark:text-slate-650 border border-slate-200/50 dark:border-slate-800/50 cursor-not-allowed shadow-none'
                                            : 'bg-[#2E5B70] hover:bg-[#254A5C] text-white hover:scale-[1.02] cursor-pointer'
                                    }`}>
                                    Câu tiếp <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {editingQuestionData && (
                    <QuestionEditModal 
                        isOpen={!!editingQuestionData} 
                        onClose={() => setEditingQuestionData(null)} 
                        initialQuestion={editingQuestionData.question} 
                        onSave={handleSaveQuestionHtml} 
                    />
                )}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-6 font-sans">
            {furiganaStyleElement}
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Score card */}
                <div className={`bg-gradient-to-r ${passed ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-red-600'} rounded-3xl p-8 text-white text-center shadow-xl`}>
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                        {passed ? <Award className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{passed ? '🎉 Chúc mừng!' : '💪 Cố gắng thêm!'}</h2>
                    <div className="text-6xl font-black my-4">{results.percentage}%</div>
                    <p className="text-xl opacity-90">{results.correct}/{results.total} câu đúng</p>
                    <p className="text-sm opacity-75 mt-2">
                        {wasRealExam ? (
                            <>Thời gian: {formatTime(timeTaken)} / {activeTest.timeLimit} phút</>
                        ) : (
                            <>Thời gian làm bài: {formatTime(timeTaken)} (Chế độ Luyện tập)</>
                        )}
                    </p>
                </div>
                {/* Section scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.sectionResults.map((sec, si) => {
                        const Icon = SECTION_ICONS[sec.type] || FileText;
                        const pct = Math.round((sec.correct / sec.total) * 100);
                        return (
                            <div key={si} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon className="w-5 h-5 text-indigo-500" />
                                    <span className="font-bold text-gray-800 dark:text-white">{sec.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                        <div className={`h-3 rounded-full transition-all ${pct >= 60 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sec.correct}/{sec.total}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Actions */}
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button onClick={exitTest} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-sm font-bold transition cursor-pointer">
                        Về trang danh sách
                    </button>
                    <button onClick={() => startTest(activeTest)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition cursor-pointer">
                        Làm lại đề này
                    </button>
                    <button onClick={() => setShowDetailedReview(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition cursor-pointer">
                        Xem chi tiết bài làm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JLPTTestResultView;
