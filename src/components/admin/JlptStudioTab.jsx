import React, { useEffect, useState } from 'react';
import {
    JLPT_LEVELS, getMondaiListForLevel, getMondaiMeta, parseYearlyExamMeta, resolveQuestionMondai
} from '../jlptTest/jlptYearlyConstants';
import {
    decodeAudioFile, uploadFileToFirebaseStorage, formatTimeShort
} from '../../utils/jlptAudioProcessor';
import {
    buildAuthoredTestObject, mergeListeningIntoExistingTest,
    splitListeningIntoMondaiTests, saveAuthoredTestToFirestore
} from '../../services/ai/jlptAuthoringService';
import { ensureFullTestLoaded } from '../../services/jlptDataService';
import JlptStudioMetaCard from './JlptStudioMetaCard';
import JlptStudioInputGrid from './JlptStudioInputGrid';
import JlptStudioEditorPanel from './JlptStudioEditorPanel';
import PdfImageCropperModal from './PdfImageCropperModal';
import MondaiAudioSlicerModal from './MondaiAudioSlicerModal';
import { showToast } from '../../utils/toast';

/**
 * Streamlined JLPT Studio: Gemini Pro (Neon) JSON importer + manual Mondai audio slicing.
 */
const JlptStudioTab = ({
    initialAuthorMode = 'yearly',
    initialLevel = 'N3',
    initialYear = 2024,
    initialSession = '12',
    initialMondai = 1,
    initialTargetTestId = '',
    existingTests = [],
    onTestSaved = () => {}
}) => {
    const normalizeMode = (m) => (m === 'mondai' || m === 'append' ? m : 'yearly');
    const [authorMode, setAuthorMode] = useState(normalizeMode(initialAuthorMode));
    const [level, setLevel] = useState(JLPT_LEVELS.includes(initialLevel) ? initialLevel : 'N3');
    const [examYear, setExamYear] = useState(Number(initialYear) || 2024);
    const [examSession, setExamSession] = useState(initialSession === '07' ? '07' : '12');
    const [mondaiNumber, setMondaiNumber] = useState(Number(initialMondai) || 1);
    const [customTitle, setCustomTitle] = useState('');
    const [isPremium, setIsPremium] = useState(false);

    // Append/Edit existing exam state
    const [targetTestId, setTargetTestId] = useState(initialTargetTestId || '');
    const [targetOldTest, setTargetOldTest] = useState(null);
    const [loadingOldTest, setLoadingOldTest] = useState(false);
    const [attachToYearly, setAttachToYearly] = useState(true);
    const [replaceOldListening, setReplaceOldListening] = useState(true);

    // Audio & optional PDF figure cropper state
    const [audioFile, setAudioFile] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [audioUrl, setAudioUrl] = useState('');
    const [audioUploadPct, setAudioUploadPct] = useState(0);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [listenFiles, setListenFiles] = useState([]);

    // Draft Output State
    const [listeningQuestions, setListeningQuestions] = useState([]);
    const [nonListeningSections, setNonListeningSections] = useState([]);
    const [editorSubTab, setEditorSubTab] = useState('listening'); // 'listening' | 'reading' | 'json'
    const [savingDb, setSavingDb] = useState(false);

    // Mondai Audio Slicer & PDF Cropper Modals
    const [showMondaiSlicer, setShowMondaiSlicer] = useState(false);
    const [mondaiAudioUrls, setMondaiAudioUrls] = useState({});
    const [cropTargetIdx, setCropTargetIdx] = useState(null);

    const firstListenPdf = listenFiles.find((f) => (f.name || '').toLowerCase().endsWith('.pdf')) || null;
    const listenImageFiles = listenFiles.filter((f) => f.type?.startsWith('image/'));

    useEffect(() => {
        if (['mondai', 'yearly', 'append'].includes(initialAuthorMode)) setAuthorMode(initialAuthorMode);
        if (JLPT_LEVELS.includes(initialLevel)) setLevel(initialLevel);
        if (initialYear) setExamYear(Number(initialYear));
        if (initialSession === '07' || initialSession === '12') setExamSession(initialSession);
        if (initialMondai) setMondaiNumber(Number(initialMondai));
        if (initialTargetTestId) setTargetTestId(initialTargetTestId);
    }, [initialAuthorMode, initialLevel, initialYear, initialSession, initialMondai, initialTargetTestId]);

    // Load complete sections when selecting an existing exam to edit or append audio
    useEffect(() => {
        if ((authorMode !== 'append' && authorMode !== 'mondai') || !targetTestId) {
            if (authorMode !== 'append') setTargetOldTest(null);
            return;
        }
        let cancelled = false;
        const loadTarget = async () => {
            setLoadingOldTest(true);
            try {
                const candidate = existingTests.find((t) => t.id === targetTestId);
                let fullTest = candidate;
                if (!fullTest || !Array.isArray(fullTest.sections) || fullTest.sections.length === 0) {
                    fullTest = (await ensureFullTestLoaded(targetTestId, candidate?.level)) || candidate;
                }
                if (cancelled) return;
                if (fullTest) {
                    setTargetOldTest(fullTest);
                    if (JLPT_LEVELS.includes(fullTest.level)) setLevel(fullTest.level);
                    const meta = parseYearlyExamMeta(fullTest);
                    if (meta.year) setExamYear(meta.year);
                    if (meta.session) setExamSession(meta.session);
                    if (fullTest.mondaiNumber) setMondaiNumber(Number(fullTest.mondaiNumber));
                    setIsPremium(Boolean(fullTest.isPremium));
                    if (fullTest.title) setCustomTitle(fullTest.title);

                    const keptNonListen = (fullTest.sections || []).filter((s) => s.type !== 'listening');
                    setNonListeningSections(keptNonListen);

                    const existingListenQs = [];
                    (fullTest.sections || []).forEach((s) => {
                        if (s.type === 'listening' && Array.isArray(s.questions)) {
                            existingListenQs.push(...s.questions);
                        }
                    });
                    if (existingListenQs.length > 0) {
                        setListeningQuestions(existingListenQs);
                        const extractedMondaiUrls = {};
                        existingListenQs.forEach((q) => {
                            if (q?.audioUrl) {
                                const mNum = resolveQuestionMondai(q);
                                if (!extractedMondaiUrls[mNum]) extractedMondaiUrls[mNum] = q.audioUrl;
                            }
                        });
                        if (Object.keys(extractedMondaiUrls).length > 0) {
                            setMondaiAudioUrls(extractedMondaiUrls);
                        }
                        const existingAudio = existingListenQs.find((q) => q?.audioUrl)?.audioUrl || '';
                        if (existingAudio) setAudioUrl(existingAudio);
                        setEditorSubTab('listening');
                    } else if (keptNonListen.length > 0) {
                        setEditorSubTab('reading');
                    }
                }
            } catch (err) {
                if (!cancelled) showToast('Không tải được chi tiết đề cũ: ' + err.message, 'error');
            } finally {
                if (!cancelled) setLoadingOldTest(false);
            }
        };
        loadTarget();
        return () => { cancelled = true; };
    }, [authorMode, targetTestId, existingTests]);

    const handleSelectAudio = async (file) => {
        if (!file) return;
        setAudioFile(file);
        const localUrl = URL.createObjectURL(file);
        setAudioUrl(localUrl);
        try {
            const decoded = await decodeAudioFile(file);
            setAudioBuffer(decoded.audioBuffer);
            showToast(`Audio hợp lệ: ${formatTimeShort(decoded.durationSec)}`, 'success');
        } catch (err) {
            showToast('Không đọc được file audio này: ' + err.message, 'error');
        }
    };

    const handleUploadAudioNow = async () => {
        if (!audioFile) return showToast('Vui lòng chọn file MP3 trước.', 'warning');
        setUploadingAudio(true);
        try {
            const ext = (audioFile.name.split('.').pop() || 'mp3').toLowerCase();
            const slug = authorMode === 'mondai'
                ? `${level.toLowerCase()}_${examYear}_${examSession}_m${mondaiNumber}_${Date.now()}`
                : `${level.toLowerCase()}_${examYear}_${examSession}_${Date.now()}`;
            const storagePath = `jlpt_audio/${level.toLowerCase()}/${slug}.${ext}`;
            const remoteUrl = await uploadFileToFirebaseStorage(audioFile, storagePath, (pct) => setAudioUploadPct(pct));
            setAudioUrl(remoteUrl);
            setListeningQuestions((prev) => prev.map((q) => ({ ...q, audioUrl: remoteUrl })));
            showToast('Đã upload audio lên Firebase Storage!', 'success');
            return remoteUrl;
        } catch (err) {
            showToast('Upload Storage thất bại: ' + err.message, 'error');
            return null;
        } finally {
            setUploadingAudio(false);
        }
    };

    const buildCurrentTestPayload = () => {
        if (authorMode === 'append') {
            if (!targetOldTest) {
                return {
                    id: targetTestId || 'pending-old-test',
                    title: customTitle.trim() || `Chưa chọn đề cũ (${level})`,
                    level,
                    sections: listeningQuestions.length > 0
                        ? [...nonListeningSections, { type: 'listening', title: 'Nghe hiểu (聴解)', questions: listeningQuestions }]
                        : [...nonListeningSections]
                };
            }
            return mergeListeningIntoExistingTest(targetOldTest, listeningQuestions, {
                level,
                examYear,
                examSession,
                attachToYearly,
                replaceExistingListening: replaceOldListening,
                preservedSections: nonListeningSections,
                customTitle,
                isPremium
            });
        }

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
        if (authorMode === 'append' && !targetOldTest) {
            return showToast('Vui lòng chọn đề cũ trước khi lưu.', 'warning');
        }
        const testObj = buildCurrentTestPayload();
        if (!testObj?.sections?.length) return showToast('Chưa có câu hỏi nào để lưu.', 'warning');
        setSavingDb(true);
        try {
            const saved = await saveAuthoredTestToFirestore(testObj);
            if (authorMode === 'append') setTargetOldTest(saved);
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

    const handleApplyMondaiAudios = (urlMap = {}) => {
        setMondaiAudioUrls((prev) => ({ ...prev, ...urlMap }));
        setListeningQuestions((prev) => prev.map((q) => {
            const mNum = resolveQuestionMondai(q);
            const slicedUrl = urlMap[mNum];
            if (!slicedUrl) return q;
            const next = { ...q, audioUrl: slicedUrl };
            delete next.audioStartSec;
            delete next.audioEndSec;
            return next;
        }));
        showToast(`Đã gắn audio theo Mondai cho ${Object.keys(urlMap).map((k) => `M${k}`).join(', ')}.`, 'success');
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
                customTitle={customTitle}
                setCustomTitle={setCustomTitle}
                defaultTitle={currentTestPreview.title}
                isPremium={isPremium}
                setIsPremium={setIsPremium}
                existingTests={existingTests}
                targetTestId={targetTestId}
                onSelectTargetTest={setTargetTestId}
                targetOldTest={targetOldTest}
                loadingOldTest={loadingOldTest}
                attachToYearly={attachToYearly}
                setAttachToYearly={setAttachToYearly}
                replaceOldListening={replaceOldListening}
                setReplaceOldListening={setReplaceOldListening}
            />

            <JlptStudioInputGrid
                audioFile={audioFile}
                audioBuffer={audioBuffer}
                audioUploadPct={audioUploadPct}
                uploadingAudio={uploadingAudio}
                audioUrl={audioUrl}
                handleSelectAudio={handleSelectAudio}
                handleUploadAudioNow={handleUploadAudioNow}
                applyAudioUrlToAllListening={applyAudioUrlToAllListening}
                listenFiles={listenFiles}
                setListenFiles={setListenFiles}
                onOpenMondaiSlicer={() => setShowMondaiSlicer(true)}
                mondaiAudioUrls={mondaiAudioUrls}
            />

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
                mondaiAudioUrls={mondaiAudioUrls}
                audioUrl={audioUrl}
                onOpenMondaiSlicer={() => setShowMondaiSlicer(true)}
            />

            <MondaiAudioSlicerModal
                isOpen={showMondaiSlicer}
                onClose={() => setShowMondaiSlicer(false)}
                level={level}
                examYear={examYear}
                examSession={examSession}
                audioFile={audioFile}
                audioBuffer={audioBuffer}
                onSelectAudioFile={handleSelectAudio}
                initialMondaiUrls={mondaiAudioUrls}
                listeningCountByMondai={listeningQuestions.reduce((acc, q) => {
                    const m = resolveQuestionMondai(q);
                    acc[m] = (acc[m] || 0) + 1;
                    return acc;
                }, {})}
                onApplyMondaiAudios={handleApplyMondaiAudios}
            />

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
