import React, { useRef, useEffect } from 'react';
import { 
    X, Check, Settings, Maximize, Minimize, FileText, 
    Save, ChevronLeft, ChevronRight, Edit3, Pencil, 
    ShieldAlert, Play, BookOpen, Lock, ChevronRight as ArrowRight 
} from 'lucide-react';
import QuestionContent from './QuestionContent';
import QuestionEditModal from './QuestionEditModal';
import HandwritingCanvas from '../ui/HandwritingCanvas';
import ExamAnnotationOverlay from '../screens/ExamAnnotationOverlay';
import { SECTION_ICONS, SECTION_COLORS } from './jlptConstants';

const JLPTTestTakeView = ({
    activeTest,
    currentSectionIdx,
    currentQuestionIdx,
    answers,
    selectAnswer,
    selectAnswerSub,
    audioRef,
    isRealExam,
    canEdit,
    onEditQuestion,
    submitTest,
    saveProgressAndExit,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    isFirst,
    isLast,
    answeredCount,
    totalQ,
    globalIdx,
    timeRemaining,
    formatTime,
    showTimer,
    showFurigana,
    setShowFurigana,
    furiganaColor,
    setFuriganaColor,
    showSettingsMenu,
    setShowSettingsMenu,
    settingsMenuRef,
    furiganaStyleElement,
    isFullscreen,
    toggleFullscreen,
    containerRef,
    // Notes states
    notes,
    isEditingNote,
    setIsEditingNote,
    noteDraft,
    setNoteDraft,
    noteTab,
    setNoteTab,
    drawDraftStrokes,
    setDrawDraftStrokes,
    drawDraftDataUrl,
    setDrawDraftDataUrl,
    saveNotesMultiple,
    deleteNotesMultiple,
    showScratchpad,
    setShowScratchpad,
    // Modals
    editingQuestionData,
    setEditingQuestionData,
    handleSaveQuestionHtml,
    showViolationWarning,
    setShowViolationWarning,
    violationCount,
    showFullscreenRequired,
    setShowFullscreenRequired,
    pendingStartTest,
    setPendingStartTest,
    savedProgresses,
    resumeTest,
    startNewPracticeConfirm,
    startRealExamConfirm,
    handleToggleTestFixed
}) => {
    const section = activeTest.sections[currentSectionIdx];
    const question = section?.questions?.[currentQuestionIdx];

    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

    const noteKey = `${activeTest.id}_s${currentSectionIdx}_q${currentQuestionIdx}`;
    const drawKey = `${noteKey}_draw`;
    const strokesKey = `${noteKey}_strokes`;
    const hasTextNote = !!notes[noteKey];
    const hasDrawNote = !!notes[drawKey];
    const hasAnyNote = hasTextNote || hasDrawNote;

    return (
        <div ref={containerRef} className={`min-h-screen flex flex-col ${isFullscreen ? 'bg-white dark:bg-gray-900 h-screen overflow-hidden' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20'}`}>
            {furiganaStyleElement}
            {/* Top Bar */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-4 py-2 font-sans">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={saveProgressAndExit} className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex items-center gap-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg cursor-pointer">
                            <X className="w-4 h-4" />
                            <span>Thoát</span>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{activeTest.title}</p>
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
                        {/* Timer */}
                        {isRealExam && showTimer && (
                            <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 ${
                                timeRemaining < 300
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-pulse'
                                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                            }`}>
                                ⏱️ {formatTime(timeRemaining)}
                            </div>
                        )}
                        {/* Scratchpad Canvas Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowScratchpad(!showScratchpad)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                showScratchpad
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Bảng nháp</span>
                        </button>
                        {/* Settings Menu */}
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
                        {/* Fullscreen Toggle */}
                        <button onClick={toggleFullscreen}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer">
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className={`flex-1 flex ${isFullscreen ? 'min-h-0 overflow-hidden' : ''}`}>
                {/* Sidebar Question Navigator */}
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
                                        let isAnswered = false;
                                        if (q.subQuestions && q.subQuestions.length > 0) {
                                            isAnswered = q.subQuestions.every((_, sqi) => answers[subAnswerKey(si, qi, sqi)] !== undefined);
                                        } else {
                                            isAnswered = answers[answerKey(si, qi)] !== undefined;
                                        }
                                        return (
                                            <button key={qi} onClick={() => goToQuestion(si, qi)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${isActive
                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                                                    : isAnswered
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                                    }`}>
                                                {qi + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {/* Submit Button in Sidebar */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                        <button onClick={submitTest}
                            className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition cursor-pointer">
                            Nộp bài ({answeredCount}/{totalQ})
                        </button>
                        {!isRealExam && (
                            <button 
                                onClick={saveProgressAndExit}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-none"
                                title="Lưu tiến trình làm bài và thoát"
                            >
                                <Save className="w-4 h-4" />
                                <span>Lưu bài lại</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Question Display */}
                <div className="flex-1 p-4 md:p-8 overflow-y-auto relative font-sans" id="jlpt-main-scroll-container">
                    <ExamAnnotationOverlay
                        testId={activeTest.id}
                        sectionIdx={currentSectionIdx}
                        questionIdx={currentQuestionIdx}
                        isEnabled={showScratchpad}
                    />
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold bg-${SECTION_COLORS[section?.type]}-100 dark:bg-${SECTION_COLORS[section?.type]}-900/30 text-${SECTION_COLORS[section?.type]}-700 dark:text-${SECTION_COLORS[section?.type]}-400`}>
                                {section?.title}
                            </span>
                            <span className="text-sm text-gray-500">Câu {currentQuestionIdx + 1}/{section?.questions?.length}</span>
                        </div>
                        {/* Progress bar */}
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
                                selectAnswer={selectAnswer}
                                selectAnswerSub={selectAnswerSub}
                                audioRef={audioRef}
                                isRealExam={isRealExam}
                                canEdit={canEdit}
                                onEditQuestion={(q, sIdx, qIdx) => setEditingQuestionData({ question: q, sectionIdx: sIdx, questionIdx: qIdx })}
                            />
                        </div>
                        
                        {/* Note Section */}
                        {activeTest && (
                            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 mb-8">
                                {isEditingNote ? (
                                    <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-900/40 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                                                <Edit3 className="w-4 h-4" /> Viết ghi chú cho câu hỏi này
                                            </div>
                                            <button onClick={() => setIsEditingNote(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => setNoteTab('text')}
                                                className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                                                    noteTab === 'text'
                                                        ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                                                        : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-355'
                                                }`}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" /> Ghi chú văn bản
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNoteTab('draw')}
                                                className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                                                    noteTab === 'draw'
                                                        ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                                                        : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-355'
                                                }`}
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Bản viết tay
                                            </button>
                                        </div>

                                        {noteTab === 'text' ? (
                                            <textarea
                                                value={noteDraft}
                                                onChange={(e) => setNoteDraft(e.target.value)}
                                                placeholder="Nhập ghi chú của bạn ở đây..."
                                                className="w-full min-h-[90px] p-3 border border-amber-200 dark:border-amber-800/60 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-sans leading-relaxed"
                                            />
                                        ) : (
                                            <div className="p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                                <HandwritingCanvas
                                                    initialStrokes={drawDraftStrokes}
                                                    onChange={(strokes, dataUrl) => {
                                                        setDrawDraftStrokes(strokes);
                                                        setDrawDraftDataUrl(dataUrl);
                                                    }}
                                                    darkMode={document.documentElement.classList.contains('dark')}
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setIsEditingNote(false)}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                            >
                                                Hủy
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const updates = {};
                                                    const deletes = [];
                                                    if (noteDraft.trim()) { updates[noteKey] = noteDraft; } else { deletes.push(noteKey); }
                                                    if (drawDraftDataUrl) { updates[drawKey] = drawDraftDataUrl; updates[strokesKey] = drawDraftStrokes; } else { deletes.push(drawKey); deletes.push(strokesKey); }
                                                    if (Object.keys(updates).length > 0) { saveNotesMultiple(updates); }
                                                    if (deletes.length > 0) { deleteNotesMultiple(deletes); }
                                                    setIsEditingNote(false);
                                                }}
                                                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-sm"
                                            >
                                                Lưu ghi chú
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {hasAnyNote ? (
                                            <div className="bg-amber-50/65 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-900/50 rounded-xl p-4 shadow-sm relative">
                                                <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/30 pb-2 mb-3">
                                                    <span className="text-amber-800 dark:text-amber-400 font-extrabold text-xs flex items-center gap-1">
                                                        <FileText className="w-3.5 h-3.5 fill-current" /> GHI CHÚ CỦA BẠN
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setNoteDraft(notes[noteKey] || '');
                                                                let strokes = [];
                                                                try { strokes = notes[strokesKey] || []; } catch(e) {}
                                                                setDrawDraftStrokes(strokes);
                                                                setDrawDraftDataUrl(notes[drawKey] || '');
                                                                setNoteTab(notes[drawKey] ? 'draw' : 'text');
                                                                setIsEditingNote(true);
                                                            }} 
                                                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition"
                                                            title="Sửa ghi chú"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const ok = await window.showConfirm("Xóa tất cả ghi chú của câu hỏi này?", { type: 'danger' });
                                                                if (ok) { deleteNotesMultiple([noteKey, drawKey, strokesKey]); }
                                                            }} 
                                                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-rose-600 dark:text-rose-400 transition"
                                                            title="Xóa ghi chú"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3.5">
                                                    {hasTextNote && (
                                                        <p className="text-sm text-slate-750 dark:text-slate-200 font-sans whitespace-pre-line leading-relaxed italic">
                                                            {notes[noteKey]}
                                                        </p>
                                                    )}
                                                    {hasDrawNote && (
                                                        <div className="flex justify-center bg-white dark:bg-slate-900/35 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/60 shadow-inner">
                                                            <img 
                                                                src={notes[drawKey]} 
                                                                alt="Ghi chú viết tay" 
                                                                className="max-h-48 object-contain dark:invert-[0.1]" 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setNoteDraft('');
                                                    setDrawDraftStrokes([]);
                                                    setDrawDraftDataUrl('');
                                                    setNoteTab('text');
                                                    setIsEditingNote(true);
                                                }}
                                                className="w-full py-2.5 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50/10 dark:hover:bg-amber-950/5 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-xs transition duration-200 cursor-pointer"
                                            >
                                                <Edit3 className="w-4 h-4" /> Thêm ghi chú cho câu hỏi này
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                            <button onClick={prevQuestion} disabled={isFirst}
                                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-sm border ${
                                    isFirst
                                        ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-350 dark:text-slate-650 border-slate-200/50 dark:border-slate-800/50 cursor-not-allowed'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:scale-[1.02] cursor-pointer'
                                }`}>
                                <ChevronLeft className="w-4 h-4 stroke-[2.5]" /> Câu trước
                            </button>
                            <button onClick={submitTest}
                                className="md:hidden px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition active:scale-95 shadow-md">
                                Nộp bài
                            </button>
                            {isLast ? (
                                <button onClick={submitTest}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer">
                                    Nộp bài <Check className="w-4 h-4 stroke-[2.5]" />
                                </button>
                            ) : (
                                <button onClick={nextQuestion}
                                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2E5B70] hover:bg-[#254A5C] text-white rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer">
                                    Câu tiếp <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                </button>
                            )}
                        </div>
                        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3 opacity-60">
                            ⌨️ Phím tắt: Phím [1-4] hoặc [A-D] để chọn đáp án | [←] / [→] để chuyển câu hỏi
                        </p>
                    </div>
                </div>
            </div>

            {/* Editing Question HTML Modal */}
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
};

export default JLPTTestTakeView;
