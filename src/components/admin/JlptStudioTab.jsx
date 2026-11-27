import React, { useEffect, useRef, useState } from 'react';
import { Music, Play, Square, Loader2 } from 'lucide-react';
import {
    JLPT_LEVELS, getMondaiListForLevel, getMondaiMeta
} from '../jlptTest/jlptYearlyConstants';
import {
    decodeAudioFile, transcribeAudioWithTimestamps,
    groupWhisperSegmentsIntoBlocks, uploadFileToFirebaseStorage, formatTimeShort
} from '../../utils/jlptAudioProcessor';
import {
    readExamSourceFiles, ocrVisualExamPages,
    generateListeningQuestionsWithAI, generateReadingLangSectionsWithAI,
    buildAuthoredTestObject, splitListeningIntoMondaiTests,
    saveAuthoredTestToFirestore
} from '../../services/ai/jlptAuthoringService';
import JlptStudioMetaCard from './JlptStudioMetaCard';
import JlptStudioInputGrid from './JlptStudioInputGrid';
import JlptStudioEditorPanel from './JlptStudioEditorPanel';
import PdfImageCropperModal from './PdfImageCropperModal';
import { showToast } from '../../utils/toast';

/**
 * JLPT Yearly (2010–2025) & Mondai Listening Authoring Studio.
 */
const JlptStudioTab = ({
    initialAuthorMode = 'yearly',
    initialLevel = 'N3',
    initialYear = 2024,
    initialSession = '12',
    initialMondai = 1,
    onTestSaved = () => {}
}) => {
    const [authorMode, setAuthorMode] = useState(initialAuthorMode === 'mondai' ? 'mondai' : 'yearly');
    const [level, setLevel] = useState(JLPT_LEVELS.includes(initialLevel) ? initialLevel : 'N3');
    const [examYear, setExamYear] = useState(Number(initialYear) || 2024);
    const [examSession, setExamSession] = useState(initialSession === '07' ? '07' : '12');
    const [mondaiNumber, setMondaiNumber] = useState(Number(initialMondai) || 1);
    const [customTitle, setCustomTitle] = useState('');
    const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
    const [isPremium, setIsPremium] = useState(false);

    // Input Source Files & Texts
    const [audioFile, setAudioFile] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [audioUrl, setAudioUrl] = useState('');
    const [audioUploadPct, setAudioUploadPct] = useState(0);
    const [autoUploadAudio, setAutoUploadAudio] = useState(true);
    const [whisperBlocks, setWhisperBlocks] = useState([]);

    const [listenFiles, setListenFiles] = useState([]);
    const [listenPasteText, setListenPasteText] = useState('');
    const [langFiles, setLangFiles] = useState([]);
    const [langPasteText, setLangPasteText] = useState('');
    const [answerFiles, setAnswerFiles] = useState([]);
    const [answerPasteText, setAnswerPasteText] = useState('');

    // Pipeline & Progress
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percent: 0, detail: '' });
    const [logs, setLogs] = useState([]);
    const abortRef = useRef(null);

    // Draft Output State
    const [listeningQuestions, setListeningQuestions] = useState([]);
    const [nonListeningSections, setNonListeningSections] = useState([]);
    const [editorSubTab, setEditorSubTab] = useState('listening'); // 'listening' | 'reading' | 'json'
    const [savingDb, setSavingDb] = useState(false);

    // PDF Cropper State
    const [cropTargetIdx, setCropTargetIdx] = useState(null);
    const firstListenPdf = listenFiles.find((f) => (f.name || '').toLowerCase().endsWith('.pdf')) || null;
    const listenImageFiles = listenFiles.filter((f) => f.type?.startsWith('image/'));

    useEffect(() => {
        if (initialAuthorMode === 'mondai' || initialAuthorMode === 'yearly') setAuthorMode(initialAuthorMode);
        if (JLPT_LEVELS.includes(initialLevel)) setLevel(initialLevel);
        if (initialYear) setExamYear(Number(initialYear));
        if (initialSession === '07' || initialSession === '12') setExamSession(initialSession);
        if (initialMondai) setMondaiNumber(Number(initialMondai));
    }, [initialAuthorMode, initialLevel, initialYear, initialSession, initialMondai]);

    const addLog = (msg) => {
        const ts = new Date().toLocaleTimeString('vi-VN');
        setLogs((prev) => [...prev.slice(-200), `[${ts}] ${msg}`]);
    };

    const handleSelectAudio = async (file) => {
        if (!file) return;
        setAudioFile(file);
        setWhisperBlocks([]);
        const localUrl = URL.createObjectURL(file);
        setAudioUrl(localUrl);
        addLog(`🎵 Đang đọc sóng âm "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
        try {
            const decoded = await decodeAudioFile(file);
            setAudioBuffer(decoded.audioBuffer);
            addLog(`✅ Audio hợp lệ: dài ${formatTimeShort(decoded.durationSec)} (${decoded.sampleRate}Hz).`);
        } catch (err) {
            addLog(`❌ Lỗi giải mã audio: ${err.message}`);
            showToast('Không đọc được file audio này.', 'error');
        }
    };

    const handleUploadAudioNow = async () => {
        if (!audioFile) return showToast('Vui lòng chọn file MP3 trước.', 'warning');
        setIsProcessing(true);
        try {
            const ext = (audioFile.name.split('.').pop() || 'mp3').toLowerCase();
            const slug = authorMode === 'mondai'
                ? `${level.toLowerCase()}_${examYear}_${examSession}_m${mondaiNumber}_${Date.now()}`
                : `${level.toLowerCase()}_${examYear}_${examSession}_${Date.now()}`;
            const storagePath = `jlpt_audio/${level.toLowerCase()}/${slug}.${ext}`;
            addLog(`☁️ Đang upload audio lên Firebase Storage (${storagePath})...`);
            const remoteUrl = await uploadFileToFirebaseStorage(audioFile, storagePath, (pct) => setAudioUploadPct(pct));
            setAudioUrl(remoteUrl);
            setListeningQuestions((prev) => prev.map((q) => ({ ...q, audioUrl: remoteUrl })));
            addLog(`✅ Upload hoàn tất! URL: ${remoteUrl}`);
            showToast('Đã upload audio lên Firebase Storage!', 'success');
            return remoteUrl;
        } catch (err) {
            addLog(`❌ Upload Storage lỗi: ${err.message}`);
            showToast('Upload Storage thất bại: ' + err.message, 'error');
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunWhisperOnly = async () => {
        if (!audioBuffer) return showToast('Vui lòng chọn file MP3 trước.', 'warning');
        setIsProcessing(true);
        setLogs([]);
        abortRef.current = new AbortController();
        try {
            const { segments, totalDuration } = await transcribeAudioWithTimestamps(audioBuffer, {
                onProgress: setProgress,
                onLog: addLog,
                signal: abortRef.current.signal
            });
            const blocks = groupWhisperSegmentsIntoBlocks(segments, totalDuration);
            setWhisperBlocks(blocks);
            addLog(`🧩 Gom tự động được ${blocks.length} đoạn câu hỏi nghe từ Whisper!`);
            showToast(`Đã tách được ${blocks.length} đoạn câu từ audio!`, 'success');
        } catch (err) {
            addLog(`⚠️ ${err.message}`);
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunFullPipeline = async () => {
        const hasListenInput = Boolean(audioBuffer || listenFiles.length || listenPasteText.trim() || answerFiles.length || answerPasteText.trim());
        const hasLangInput = authorMode === 'yearly' && Boolean(langFiles.length || langPasteText.trim());
        if (!hasListenInput && !hasLangInput) {
            return showToast('Hãy nạp ít nhất 1 nguồn file đề (PDF/Ảnh/Text) hoặc file MP3.', 'warning');
        }

        setIsProcessing(true);
        setLogs([]);
        abortRef.current = new AbortController();
        const sig = abortRef.current.signal;

        try {
            // 1. Optional auto-upload MP3 to Firebase Storage so links are permanent
            let resolvedAudioUrl = audioUrl;
            if (audioFile && autoUploadAudio && (!resolvedAudioUrl || resolvedAudioUrl.startsWith('blob:'))) {
                setProgress({ stage: 'UPLOAD', percent: 8, detail: 'Đang upload MP3 lên Firebase Storage...' });
                const ext = (audioFile.name.split('.').pop() || 'mp3').toLowerCase();
                const storagePath = `jlpt_audio/${level.toLowerCase()}/${level.toLowerCase()}_${examYear}_${examSession}_${Date.now()}.${ext}`;
                addLog(`☁️ Upload MP3 lên Firebase Storage (${storagePath})...`);
                resolvedAudioUrl = await uploadFileToFirebaseStorage(audioFile, storagePath, (pct) => setAudioUploadPct(pct));
                setAudioUrl(resolvedAudioUrl);
                addLog(`✅ Đã có URL Audio vĩnh viễn: ${resolvedAudioUrl}`);
            }

            // 2. Whisper STT (if MP3 provided and not yet transcribed)
            let blocks = whisperBlocks;
            if (audioBuffer && blocks.length === 0) {
                const { segments, totalDuration } = await transcribeAudioWithTimestamps(audioBuffer, {
                    onProgress: (p) => setProgress({ ...p, percent: 10 + Math.round(p.percent * 0.35) }),
                    onLog: addLog,
                    signal: sig
                });
                blocks = groupWhisperSegmentsIntoBlocks(segments, totalDuration);
                setWhisperBlocks(blocks);
                addLog(`🧩 Whisper tách xong ${blocks.length} câu hỏi có mốc giây.`);
            }

            // 3. Extract Answers / Script text if provided
            let answerText = answerPasteText.trim();
            if (answerFiles.length > 0) {
                const ansSrc = await readExamSourceFiles(answerFiles, { onLog: addLog, signal: sig });
                const ansOcr = ansSrc.visualPages.length > 0
                    ? await ocrVisualExamPages(ansSrc.visualPages, { roleDescription: 'bảng đáp án/script', model: aiModel, onLog: addLog, signal: sig })
                    : '';
                answerText = [answerText, ansSrc.text, ansOcr].filter(Boolean).join('\n');
            }

            // 4. Language & Reading sections (Full Yearly Exam mode)
            if (hasLangInput) {
                const langSrc = await readExamSourceFiles(langFiles, { onLog: addLog, signal: sig });
                const langOcr = langSrc.visualPages.length > 0
                    ? await ocrVisualExamPages(langSrc.visualPages, { roleDescription: 'đề Kiến thức ngôn ngữ & Đọc hiểu', model: aiModel, onLog: addLog, signal: sig })
                    : '';
                const combinedLangText = [langPasteText.trim(), langSrc.text, langOcr].filter(Boolean).join('\n');

                if (combinedLangText) {
                    const langSecs = await generateReadingLangSectionsWithAI({
                        level,
                        langPaperText: combinedLangText,
                        answerKeyText: answerText,
                        model: aiModel,
                        onProgress: (p) => setProgress({ ...p, percent: 45 + Math.round(p.percent * 0.25) }),
                        onLog: addLog,
                        signal: sig
                    });
                    setNonListeningSections(langSecs);
                }
            }

            // 5. Listening questions generation
            if (hasListenInput) {
                let listenText = listenPasteText.trim();
                if (listenFiles.length > 0) {
                    const lSrc = await readExamSourceFiles(listenFiles, { onLog: addLog, signal: sig });
                    const lOcr = lSrc.visualPages.length > 0
                        ? await ocrVisualExamPages(lSrc.visualPages, { roleDescription: 'đề Nghe hiểu', model: aiModel, onLog: addLog, signal: sig })
                        : '';
                    listenText = [listenText, lSrc.text, lOcr].filter(Boolean).join('\n');
                }

                const qs = await generateListeningQuestionsWithAI({
                    level,
                    examYear,
                    examSession,
                    targetMondai: authorMode === 'mondai' ? mondaiNumber : null,
                    blocks,
                    audioUrl: resolvedAudioUrl,
                    examPaperText: listenText,
                    answerScriptText: answerText,
                    model: aiModel,
                    onProgress: (p) => setProgress({ ...p, percent: 70 + Math.round(p.percent * 0.3) }),
                    onLog: addLog,
                    signal: sig
                });
                setListeningQuestions(qs);
                setEditorSubTab('listening');
            } else {
                setEditorSubTab('reading');
            }

            setProgress({ stage: 'DONE', percent: 100, detail: 'Soạn dữ liệu hoàn tất! Kiểm tra và xuất bản bên dưới.' });
            showToast('AI đã soạn xong bộ dữ liệu JLPT!', 'success');
        } catch (err) {
            addLog(`❌ Dừng: ${err.message}`);
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const buildCurrentTestPayload = () => {
        const secs = [...nonListeningSections];
        if (listeningQuestions.length > 0) {
            const mMeta = authorMode === 'mondai' ? getMondaiMeta(level, mondaiNumber) : null;
            secs.push({
                type: 'listening',
                title: authorMode === 'mondai' && mMeta
                    ? `Mondai ${mMeta.mondai}: ${mMeta.ja} · ${mMeta.vi}`
                    : 'Nghe hiểu (聴解)',
                questions: listeningQuestions
            });
        }
        return buildAuthoredTestObject({
            mode: authorMode,
            level,
            examYear,
            examSession,
            mondaiNumber,
            customTitle,
            sections: secs,
            isPremium
        });
    };

    const handleSaveToApp = async () => {
        const testObj = buildCurrentTestPayload();
        if (!testObj.sections.length) return showToast('Chưa có câu hỏi nào để lưu.', 'warning');
        setSavingDb(true);
        try {
            const saved = await saveAuthoredTestToFirestore(testObj);
            onTestSaved(saved);
            showToast(`Đã lưu "${saved.title}" lên hệ thống!`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSavingDb(false);
        }
    };

    const handleSplitAndSaveMondais = async () => {
        const testObj = buildCurrentTestPayload();
        const mondaiTests = splitListeningIntoMondaiTests(testObj);
        if (!mondaiTests.length) return showToast('Chưa có câu nghe hiểu nào để tách Mondai.', 'warning');
        setSavingDb(true);
        try {
            for (const mt of mondaiTests) {
                const saved = await saveAuthoredTestToFirestore(mt);
                onTestSaved(saved);
            }
            showToast(`Đã tách & lưu ${mondaiTests.length} bộ Nghe theo Mondai cho ${level}!`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSavingDb(false);
        }
    };

    const applyAudioUrlToAllListening = (nextUrl) => {
        setAudioUrl(nextUrl);
        setListeningQuestions((prev) => prev.map((q) => ({ ...q, audioUrl: nextUrl })));
    };

    const addBlankListeningQuestion = () => {
        const mMeta = getMondaiMeta(level, authorMode === 'mondai' ? mondaiNumber : 1);
        setListeningQuestions((prev) => ([
            ...prev,
            {
                mondai: mMeta.mondai,
                mondaiTitle: `Mondai ${mMeta.mondai}: ${mMeta.ja} · ${mMeta.vi}`,
                questionNumber: prev.length + 1,
                question: '',
                options: ['1', '2', '3', '4'],
                correctAnswer: 0,
                answer: 0,
                audioUrl: audioUrl || '',
                audioStartSec: 0,
                audioEndSec: 60,
                imageUrl: '',
                script: [{ speaker: 'M', ja: '', vi: '' }],
                explanation: ''
            }
        ]));
    };

    const currentTestPreview = buildCurrentTestPayload();
    const mondaiChoices = getMondaiListForLevel(level);
    const totalLangQ = nonListeningSections.reduce((s, sec) => s + (sec.questions?.length || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Target Mode & Exam Metadata */}
            <JlptStudioMetaCard
                authorMode={authorMode}
                setAuthorMode={setAuthorMode}
                level={level}
                setLevel={setLevel}
                examYear={examYear}
                setExamYear={setExamYear}
                examSession={examSession}
                setExamSession={setExamSession}
                mondaiNumber={mondaiNumber}
                setMondaiNumber={setMondaiNumber}
                mondaiChoices={mondaiChoices}
                aiModel={aiModel}
                setAiModel={setAiModel}
                customTitle={customTitle}
                setCustomTitle={setCustomTitle}
                defaultTitle={currentTestPreview.title}
                isPremium={isPremium}
                setIsPremium={setIsPremium}
            />

            {/* 2. Upload Inputs Grid */}
            <JlptStudioInputGrid
                authorMode={authorMode}
                audioFile={audioFile}
                audioBuffer={audioBuffer}
                audioUploadPct={audioUploadPct}
                isProcessing={isProcessing}
                audioUrl={audioUrl}
                autoUploadAudio={autoUploadAudio}
                handleSelectAudio={handleSelectAudio}
                handleUploadAudioNow={handleUploadAudioNow}
                applyAudioUrlToAllListening={applyAudioUrlToAllListening}
                setAutoUploadAudio={setAutoUploadAudio}
                listenFiles={listenFiles}
                setListenFiles={setListenFiles}
                listenPasteText={listenPasteText}
                setListenPasteText={setListenPasteText}
                langFiles={langFiles}
                setLangFiles={setLangFiles}
                langPasteText={langPasteText}
                setLangPasteText={setLangPasteText}
                answerFiles={answerFiles}
                setAnswerFiles={setAnswerFiles}
                answerPasteText={answerPasteText}
                setAnswerPasteText={setAnswerPasteText}
            />

            {/* 3. Action Bar & Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleRunFullPipeline}
                            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                            <span>{isProcessing ? 'Đang xử lý...' : 'Tự động soạn toàn bộ data'}</span>
                        </button>

                        {audioBuffer && (
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={handleRunWhisperOnly}
                                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                                <Music className="w-4 h-4" />
                                <span>Chỉ chạy Whisper tách mốc giây ({whisperBlocks.length})</span>
                            </button>
                        )}

                        {isProcessing && (
                            <button
                                type="button"
                                onClick={() => abortRef.current?.abort()}
                                className="px-3.5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 border-b-4 border-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                                <Square className="w-3.5 h-3.5 fill-white" />
                                <span>Hủy</span>
                            </button>
                        )}
                    </div>

                    {progress.percent > 0 && (
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-600 font-mono">
                            <span>{progress.percent}%</span>
                            <span className="text-slate-500 font-sans font-semibold max-w-xs truncate">{progress.detail}</span>
                        </div>
                    )}
                </div>

                {progress.percent > 0 && (
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-2xl p-3 max-h-40 overflow-y-auto space-y-0.5">
                        {logs.map((l, idx) => <div key={idx}>{l}</div>)}
                    </div>
                )}
            </div>

            {/* 4. Editor & Publish Workspace */}
            <JlptStudioEditorPanel
                editorSubTab={editorSubTab}
                setEditorSubTab={setEditorSubTab}
                listeningQuestions={listeningQuestions}
                setListeningQuestions={setListeningQuestions}
                totalLangQ={totalLangQ}
                savingDb={savingDb}
                handleSaveToApp={handleSaveToApp}
                authorMode={authorMode}
                handleSplitAndSaveMondais={handleSplitAndSaveMondais}
                currentTestPreview={currentTestPreview}
                level={level}
                examYear={examYear}
                examSession={examSession}
                addBlankListeningQuestion={addBlankListeningQuestion}
                firstListenPdf={firstListenPdf}
                listenImageFiles={listenImageFiles}
                setCropTargetIdx={setCropTargetIdx}
                nonListeningSections={nonListeningSections}
                setNonListeningSections={setNonListeningSections}
            />

            {/* PDF / Image Illustration Cropper Modal */}
            <PdfImageCropperModal
                isOpen={cropTargetIdx !== null}
                onClose={() => setCropTargetIdx(null)}
                pdfFile={firstListenPdf}
                imageFiles={listenImageFiles}
                storagePrefix={`jlpt_images/${level.toLowerCase()}_${examYear}_${examSession}`}
                onCropComplete={(imgUrl) => {
                    if (cropTargetIdx !== null) {
                        setListeningQuestions((prev) =>
                            prev.map((q, idx) => (idx === cropTargetIdx ? { ...q, imageUrl: imgUrl } : q))
                        );
                        showToast('Đã cắt & gắn hình vào câu hỏi!', 'success');
                    }
                }}
            />
        </div>
    );
};

export default JlptStudioTab;
