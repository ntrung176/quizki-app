import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    ArrowLeft, RotateCcw, Check, Heart, Bookmark, Edit, Trash2, 
    Layers, Tag, Volume2, Plus, Wand2 
} from 'lucide-react';
import { renderMaziiStyleKanji } from '../../utils/kanjiStroke';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';
import { playAudio } from '../../utils/audio';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';
import { KANJI_TREE, RADICALS_214 } from '../../data/radicals214';
import openjlptComposition from '../../data/openjlptComposition.json' with { type: 'json' };
import openjlptComponentInfo from '../../data/openjlptComponentInfo.json' with { type: 'json' };
import kanjiComponents from '../../data/kanjiComponents.json' with { type: 'json' };
import { computeSinoVietnameseForWord, getSinoVietnamese } from '../../utils/kanjiHVLookup';

const RADICAL_NAME_MAP = {};
if (RADICALS_214) {
    Object.entries(RADICALS_214).forEach(([char, info]) => {
        if (info && info.name) {
            RADICAL_NAME_MAP[char] = info.name;
            if (info.variants && Array.isArray(info.variants)) {
                info.variants.forEach(v => {
                    RADICAL_NAME_MAP[v] = info.name;
                });
            }
        }
    });
}

const KanjiDetailView = ({
    selectedKanji,
    setSelectedKanji,
    setShowDetailModal,
    isFullPage = false,
    navigate,
    location,
    ROUTES,
    getKanjiDetail,
    getVocabForKanji,
    getRelatedKanji,
    kanjiMap,
    userKanjiSRS,
    toggleKanjiSRS,
    isAdmin,
    openEditKanji,
    handleDeleteKanji,
    loadingApiData,
    kanjiApiData,
    kanjiList,
    detailWriterContainerRef,
    detailStrokeCtrl,
    onAddVocabToSRS,
    addedVocabIds,
    allUserCards,
    addingVocabId,
    handleAddVocabToSRS,
    openEditVocab,
    handleDeleteVocab,
    setShowAddVocabModal,
    handleGenerateAiVocabForSingleKanji,
    generatingAiVocab
}) => {
    const detail = selectedKanji ? getKanjiDetail(selectedKanji) : null;
    const vocab = selectedKanji ? getVocabForKanji(selectedKanji) : [];
    const det = detail || {};

    // --- Pitch Accent state & fetching ---
    const [pitchAccentData, setPitchAccentData] = useState({});

    useEffect(() => {
        if (!selectedKanji || !detailWriterContainerRef?.current) return;
        let isMounted = true;

        renderMaziiStyleKanji(detailWriterContainerRef.current, selectedKanji).then(ctrl => {
            if (isMounted && detailStrokeCtrl) {
                detailStrokeCtrl.current = ctrl;
            }
        });

        return () => {
            isMounted = false;
        };
    }, [selectedKanji, detailWriterContainerRef, detailStrokeCtrl]);

    // Fetch pitch accent data for all vocab of this kanji
    useEffect(() => {
        if (!vocab || vocab.length === 0) return;
        let isMounted = true;

        const fetchAll = async () => {
            const newData = {};
            for (const v of vocab) {
                if (!v.word) continue;
                try {
                    const data = await fetchJotobaWordData(v.word);
                    if (data && isMounted) {
                        newData[v.word] = data;
                    }
                } catch (_) {}
            }
            if (isMounted) {
                setPitchAccentData(prev => ({ ...prev, ...newData }));
            }
        };
        fetchAll();

        return () => { isMounted = false; };
    }, [selectedKanji, vocab.length]);

    // Render pitch accent inline for a vocab word
    const renderVocabPitch = useCallback((v) => {
        const jotobaData = pitchAccentData[v.word];
        const reading = v.reading || jotobaData?.reading || null;
        if (!reading) return null;

        const storedPitch = v.accent !== undefined && v.accent !== '' && v.accent !== null
            ? accentNumberToPitchParts(reading, v.accent)
            : null;
        const pitchParts = v.pitch || storedPitch || jotobaData?.pitch || null;

        if (!pitchParts || pitchParts.length === 0) {
            return (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-japanese ml-0.5">（{reading}）</span>
            );
        }

        const readingChars = [...reading];
        const charPitchMap = [];
        for (const pp of pitchParts) {
            for (const c of [...pp.part]) {
                charPitchMap.push({ char: c, high: pp.high });
            }
        }

        const lineColor = '#ef4444';
        return (
            <span className="font-japanese inline-flex items-end gap-0 ml-1" title="Pitch Accent">
                {readingChars.map((char, ci) => {
                    const pm = charPitchMap[ci];
                    const isHigh = pm ? pm.high : false;
                    const nextHigh = ci + 1 < charPitchMap.length ? charPitchMap[ci + 1]?.high : isHigh;
                    const showTransition = ci + 1 < charPitchMap.length && isHigh !== nextHigh;
                    return (
                        <span key={ci} className="relative inline-block">
                            <span
                                className="block text-gray-500 dark:text-gray-400"
                                style={{
                                    borderTop: `2px solid ${isHigh ? lineColor : 'transparent'}`,
                                    borderBottom: `2px solid ${!isHigh ? lineColor : 'transparent'}`,
                                    paddingLeft: '1px',
                                    paddingRight: '1px',
                                    lineHeight: '1.2',
                                    fontSize: '0.75rem',
                                }}
                            >
                                {char}
                            </span>
                            {showTransition && (
                                <span className="absolute -right-[0.75px] top-0 bottom-0 w-[2px]" style={{ backgroundColor: lineColor }}></span>
                            )}
                        </span>
                    );
                })}
            </span>
        );
    }, [pitchAccentData]);

    const getVocabReadingType = useCallback((v) => {
        if (!detail) return 'Onyomi';
        const toHiragana = (str) => (str || '').replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
        
        const kunyomiStr = Array.isArray(detail.kunyomi) ? detail.kunyomi.join(',') : (detail.kunyomi || '');
        const onyomiStr = Array.isArray(detail.onyomi) ? detail.onyomi.join(',') : (detail.onyomi || '');
        
        const readingClean = toHiragana(v.reading || (v.word?.includes('（') ? v.word.split('（')[1]?.replace('）', '') : ''));

        const kunList = kunyomiStr.split(/[,，、\s]+/).map(s => toHiragana(s.split('.')[0].replace(/[-。]/g, ''))).filter(Boolean);
        const onList = onyomiStr.split(/[,，、\s]+/).map(s => toHiragana(s.replace(/[-\.。]/g, ''))).filter(Boolean);

        for (const kr of kunList) {
            if (kr && readingClean.includes(kr)) return 'Kunyomi';
        }
        for (const or of onList) {
            if (or && readingClean.includes(or)) return 'Onyomi';
        }
        return 'Onyomi';
    }, [detail]);

    // --- Resolve Component Details from OpenJLPT & Kanji Data ---
    const resolveComponent = useCallback((char) => {
        if (!char) return null;
        const kanjiDoc = kanjiMap?.get ? kanjiMap.get(char) : null;
        const jotobaDoc = getJotobaKanjiData(char);
        const compDoc = openjlptComponentInfo[char];
        const isKanji = Boolean(kanjiDoc || (jotobaDoc && jotobaDoc.sinoViet));

        const sinoViet = kanjiDoc?.sinoViet || jotobaDoc?.sinoViet || compDoc?.hv || getSinoVietnamese(char) || RADICAL_NAME_MAP[char] || '';
        const meaning = kanjiDoc?.meaning || kanjiDoc?.meaningVi || jotobaDoc?.meaningVi || jotobaDoc?.meanings?.[0] || compDoc?.vn || '';
        const level = kanjiDoc?.level || jotobaDoc?.level || (jotobaDoc?.jlpt ? `N${jotobaDoc.jlpt}` : null);
        const variantOf = compDoc?.variantOf || null;

        return {
            char,
            sinoViet: String(sinoViet).trim().toUpperCase(),
            meaning: String(meaning).trim(),
            level,
            variantOf,
            isKanji
        };
    }, [kanjiMap]);

    // OpenJLPT Component breakdown: parts forming this kanji ('in') and kanji containing this part ('out')
    const { inComponents, outKanji } = useMemo(() => {
        if (!selectedKanji) return { inComponents: [], outKanji: [] };
        
        const openComp = openjlptComposition[selectedKanji] || { in: [], out: [] };
        
        // 1. in components (fallback to legacy parts if in is empty)
        let inParts = (openComp.in || []).map(resolveComponent).filter(Boolean);
        if (inParts.length === 0) {
            const legacyParts = kanjiComponents[selectedKanji] || det.parts || kanjiApiData?.parts || getJotobaKanjiData(selectedKanji)?.parts || [];
            const legacyArr = (typeof legacyParts === 'string' ? legacyParts.split(/[,，、\s]+/) : legacyParts)
                .filter(p => p && p !== selectedKanji);
            if (legacyArr.length > 0) {
                inParts = legacyArr.map(resolveComponent).filter(Boolean);
            }
        }
        // If still empty and it's a known radical, show self as component
        if (inParts.length === 0 && (openjlptComponentInfo[selectedKanji] || det.sinoViet)) {
            const selfResolved = resolveComponent(selectedKanji);
            if (selfResolved) inParts = [selfResolved];
        }

        // 2. out kanji (kanji containing this character/radical)
        const levelOrder = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
        const rawOutList = openComp.out && openComp.out.length > 0
            ? openComp.out
            : Object.entries(KANJI_TREE)
                .filter(([k, v]) => v.components?.includes(selectedKanji) && k !== selectedKanji)
                .map(([k]) => k);

        const outList = rawOutList
            .map(resolveComponent)
            .filter(p => p && p.isKanji && p.char !== selectedKanji)
            .sort((a, b) => (levelOrder[a.level] || 9) - (levelOrder[b.level] || 9))
            .slice(0, 12);

        return { inComponents: inParts, outKanji: outList };
    }, [selectedKanji, resolveComponent, det.parts, det.sinoViet, kanjiApiData?.parts]);

    if (!selectedKanji) return null;

    const content = (
        <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex justify-between items-center mb-3 sm:mb-4 flex-shrink-0">
                <button 
                    onClick={() => { 
                        setShowDetailModal(false); 
                        setSelectedKanji(null);
                        const searchParams = new URLSearchParams(location.search);
                        const from = searchParams.get('from');
                        if (from === 'saved' || location.state?.fromSaved || location.state?.fromTab === 'saved') { 
                            navigate(ROUTES.KANJI_SAVED, { replace: true }); 
                        } else if (location.state?.fromLesson) { 
                            navigate(-1); 
                        } else { 
                            navigate(ROUTES.KANJI_LIST, { replace: true }); 
                        } 
                    }} 
                    className="px-4 py-2 flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer font-black text-xs sm:text-sm uppercase tracking-wider shadow-xs select-none"
                >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" /> <span>Quay lại</span>
                </button>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-black font-mono uppercase tracking-widest">
                    CHI TIẾT KANJI
                </div>
            </div>

            {/* Main 3-Column Layout */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 sm:pr-2 pb-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                    
                    {/* COLUMN 1: Stroke Animation Canvas (No Stroke Order Guide) */}
                    <div className="lg:col-span-4 flex flex-col items-center">
                        <div className="w-full max-w-[220px] sm:max-w-[280px] lg:max-w-none bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl aspect-square flex items-center justify-center relative shadow-xs overflow-hidden">
                            <div
                                key={`kanji-display-${selectedKanji}`}
                                ref={detailWriterContainerRef}
                                className="w-full h-full flex items-center justify-center"
                            />
                            <button
                                onClick={() => detailStrokeCtrl.current?.replay()}
                                className="absolute bottom-3 right-3 p-3 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white rounded-2xl shadow-sm transition-all active:translate-y-0.5 active:border-b-0 cursor-pointer"
                                title="Xem lại nét vẽ"
                            >
                                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <div className="absolute top-3 right-3 bg-amber-500 border-b-2 border-amber-600 text-white text-xs font-black px-3 py-1 rounded-xl shadow-xs">
                                {kanjiApiData?.stroke_count || det.strokeCount || '?'} nét
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: Meta Information, Illustration & Thành phần bộ thủ */}
                    <div className="lg:col-span-4 space-y-3 sm:space-y-4">
                        {/* Title Bar: Kanji - SinoViet - Pink Heart Bookmark Button */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-4xl font-black text-slate-900 dark:text-white font-japanese">{selectedKanji}</span>
                            <span className="text-2xl text-slate-300 dark:text-slate-600 font-bold">—</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{det.sinoViet || ''}</span>
                            
                            {(() => {
                                const kanjiDoc = kanjiMap?.get(selectedKanji);
                                const isSRSAdded = Boolean(
                                    (selectedKanji && userKanjiSRS?.has(selectedKanji)) ||
                                    (selectedKanji && userKanjiSRS?.has(`kanji_${selectedKanji}`)) ||
                                    (kanjiDoc?.id && userKanjiSRS?.has(kanjiDoc.id)) ||
                                    (kanjiDoc?.character && userKanjiSRS?.has(kanjiDoc.character)) ||
                                    (det?.id && userKanjiSRS?.has(det.id))
                                );
                                return (
                                    <button
                                        onClick={(e) => !isSRSAdded && toggleKanjiSRS(e, selectedKanji)}
                                        disabled={isSRSAdded}
                                        className={`py-2 px-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none ${isSRSAdded
                                            ? 'bg-rose-500 border-b-4 border-rose-700 text-white cursor-default shadow-sm'
                                            : 'bg-white hover:bg-rose-50 text-rose-600 border-2 border-b-4 border-rose-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-rose-400 dark:border-rose-900 active:translate-y-0.5 active:border-b-2'
                                            }`}
                                    >
                                        <Heart className={`w-4 h-4 ${isSRSAdded ? 'fill-white text-white' : 'text-rose-500 stroke-[2.5]'}`} />
                                        <span>{isSRSAdded ? 'Đã lưu' : 'Lưu Kanji vào ôn tập'}</span>
                                    </button>
                                );
                            })()}

                            {isAdmin && (
                                <div className="ml-auto flex gap-1.5">
                                    <button
                                        onClick={() => openEditKanji(det)}
                                        className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                        title="Chỉnh sửa kanji"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    {det.id && (
                                        <button
                                            onClick={() => { handleDeleteKanji(det.id); setShowDetailModal(false); navigate('/kanji/list'); }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                            title="Xóa kanji"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Card 1: Meta List + Illustration Image */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                            <div className="flex gap-3 sm:gap-4 items-start justify-between">
                                <div className="space-y-2 text-sm flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">Ý nghĩa:</span> 
                                        <span className="text-amber-600 dark:text-amber-400 font-black text-sm sm:text-base">{det.meaning || det.meaningVi || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">Trình độ JLPT:</span> 
                                        <span className="text-slate-900 dark:text-white font-black text-xs">{det.level || (kanjiApiData?.jlpt ? `N${kanjiApiData.jlpt}` : 'N5')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">Số nét:</span> 
                                        <span className="text-slate-900 dark:text-white font-black text-xs">{det.strokeCount || kanjiApiData?.stroke_count || getJotobaKanjiData(selectedKanji)?.stroke_count || '?'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">Âm Kun:</span> 
                                        <span className="text-rose-500 dark:text-rose-400 font-japanese font-black text-xs">{det.kunyomi || '—'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">Âm On:</span> 
                                        <span className="text-sky-600 dark:text-sky-400 font-japanese font-black text-xs">{det.onyomi || '—'}</span>
                                    </div>

                                    {/* Thành phần */}
                                    {inComponents.length > 0 && (
                                        <div className="pt-1">
                                            <span className="text-slate-500 dark:text-slate-400 font-bold text-xs block mb-1">Thành phần:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {inComponents.map((comp, idx) => (
                                                    <button
                                                        key={idx}
                                                        disabled={!comp.isKanji}
                                                        onClick={() => {
                                                            if (comp.isKanji) {
                                                                navigate(`/kanji/list/${comp.char}`);
                                                                setSelectedKanji(comp.char);
                                                            }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border-2 border-b-3 transition-all ${
                                                            comp.isKanji
                                                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-100 active:translate-y-0.5 cursor-pointer shadow-2xs'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-default'
                                                        }`}
                                                    >
                                                        <span className="font-japanese text-sm">{comp.char}</span>
                                                        {comp.sinoViet && <span className="text-[10px] uppercase font-black">{comp.sinoViet}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Image Illustration */}
                                {det.imageUrl ? (
                                    <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 shrink-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border-2 border-b-4 border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 shadow-xs">
                                        <img src={det.imageUrl} alt={selectedKanji} className="max-w-full max-h-full object-contain rounded-2xl" />
                                    </div>
                                ) : (
                                    <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 shrink-0 bg-slate-50 dark:bg-slate-850 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-2 text-center shadow-xs">
                                        <span className="text-3xl font-japanese font-black text-slate-800 dark:text-slate-200 drop-shadow-xs">{selectedKanji}</span>
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mt-1 tracking-wider">{det.sinoViet}</span>
                                    </div>
                                )}
                            </div>

                            {/* Mnemonic Sentence */}
                            {det.mnemonic && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5 text-xs">
                                    <span className="text-amber-500 shrink-0">💡</span>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                                        <strong className="text-slate-900 dark:text-white font-black">Cách nhớ:</strong> {det.mnemonic}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Card 2: Thành phần bộ thủ (Icon lớn + Lưới xanh Tạo thành) */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[2.5]" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    Thành phần bộ thủ
                                </h4>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
                                {/* Main Blue Character Box with Badge & "TẠO THÀNH" label */}
                                <div className="flex flex-col items-center">
                                    <div className="relative">
                                        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-sky-500 border-b-4 border-sky-700 shadow-md flex items-center justify-center">
                                            <span className="text-3xl sm:text-4xl font-japanese text-white font-black drop-shadow-sm">{selectedKanji}</span>
                                        </div>
                                        {det.sinoViet && (
                                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white dark:bg-slate-900 rounded-full text-[10px] sm:text-xs font-black text-sky-700 dark:text-sky-300 border-2 border-sky-300 dark:border-sky-800 shadow-xs uppercase tracking-wide whitespace-nowrap">
                                                {det.sinoViet}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-3">
                                        TẠO THÀNH
                                    </span>
                                </div>

                                {/* Derived Green Grid */}
                                {outKanji.length > 0 ? (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 w-full pt-1">
                                        {outKanji.map((kDoc, idx) => (
                                            <button
                                                key={`out-${kDoc.char}-${idx}`}
                                                onClick={() => {
                                                    navigate(`/kanji/list/${kDoc.char}`);
                                                    setSelectedKanji(kDoc.char);
                                                }}
                                                className="bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-2 border-b-3 border-emerald-300 dark:border-emerald-800 rounded-2xl p-2 flex flex-col items-center justify-center transition-all active:translate-y-0.5 cursor-pointer group shadow-2xs select-none"
                                            >
                                                <span className="text-lg font-japanese font-black text-emerald-800 dark:text-emerald-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    {kDoc.char}
                                                </span>
                                                <span className="px-1 py-0.2 rounded bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 text-[8px] font-black uppercase mt-0.5 max-w-full truncate shadow-2xs">
                                                    {kDoc.sinoViet || '—'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1 font-medium">
                                        Không có chữ Kanji phái sinh liên kết
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: Từ vựng List & Thêm từ vựng */}
                    <div className="lg:col-span-4 flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
                            <div>
                                {/* Header */}
                                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-amber-600 dark:text-amber-400 font-black text-sm flex items-center gap-1.5 uppercase tracking-wide">
                                        <Tag className="w-4 h-4 stroke-[2.5]" /> Từ vựng ({vocab.length})
                                    </h3>
                                    {handleGenerateAiVocabForSingleKanji && (
                                        <button
                                            onClick={() => handleGenerateAiVocabForSingleKanji(selectedKanji)}
                                            disabled={generatingAiVocab}
                                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                                            title="Sử dụng AI tự động tạo từ vựng JLPT phổ biến cho Kanji này"
                                        >
                                            <Wand2 className={`w-3.5 h-3.5 stroke-[2.5] ${generatingAiVocab ? 'animate-spin' : ''}`} />
                                            {generatingAiVocab ? 'AI đang tạo...' : 'AI Tạo Từ Vựng'}
                                        </button>
                                    )}
                                </div>

                                {/* Grouped Vocab list */}
                                {(() => {
                                    if (vocab.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                                                <p className="text-slate-400 dark:text-slate-500 text-xs italic font-medium">
                                                    Chưa có từ vựng cho chữ Kanji này
                                                </p>
                                                {handleGenerateAiVocabForSingleKanji && (
                                                    <button
                                                        onClick={() => handleGenerateAiVocabForSingleKanji(selectedKanji)}
                                                        disabled={generatingAiVocab}
                                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-teal-50 dark:bg-slate-700 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                                    >
                                                        <Wand2 className={`w-3.5 h-3.5 ${generatingAiVocab ? 'animate-spin' : ''}`} />
                                                        {generatingAiVocab ? 'AI đang khởi tạo...' : 'Tạo từ vựng với AI'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    }

                                    const seenWords = new Set();
                                    const kunyomiVocab = [];
                                    const onyomiVocab = [];
                                    for (const v of vocab) {
                                        const wordKey = (v.word || '').trim();
                                        if (wordKey && seenWords.has(wordKey)) continue;
                                        if (wordKey) seenWords.add(wordKey);

                                        const rType = getVocabReadingType(v);
                                        if (rType === 'Kunyomi') {
                                            kunyomiVocab.push(v);
                                        } else {
                                            onyomiVocab.push(v);
                                        }
                                    }

                                    const renderVocabCardItem = (v, i, rType) => {
                                        const wordClean = (v.word || '').split('（')[0].split('(')[0].trim();
                                        const sinoVietText = v.sinoViet || computeSinoVietnameseForWord(wordClean, kanjiMap);
                                        return (
                                            <div key={v.id || i} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-2xs">
                                                <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-sm">
                                                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                        <span className={`font-japanese font-bold text-base ${rType === 'Kunyomi' ? 'text-red-500 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                                            {wordClean}
                                                        </span>
                                                        {renderVocabPitch(v)}
                                                        {sinoVietText && <span className="px-1.5 py-0.2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold uppercase rounded ml-1">[{sinoVietText}]</span>}
                                                    </div>
                                                    <div className="text-slate-700 dark:text-slate-300 text-xs line-clamp-1">{v.meaning}</div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    {v.audioBase64 ? (
                                                        <button onClick={() => playAudio(v.audioBase64, v.word)} className="p-1 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-colors cursor-pointer" title="Nghe phát âm">
                                                            <Volume2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => playAudio(null, v.reading || v.word)} className="p-1 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-colors cursor-pointer" title="Nghe phát âm">
                                                            <Volume2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {onAddVocabToSRS && (
                                                        <button onClick={() => handleAddVocabToSRS(v)} className="p-1 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-colors cursor-pointer" title="Thêm vào học phần">
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <>
                                                            <button onClick={() => openEditVocab(v)} className="p-1 text-slate-400 hover:text-sky-500 cursor-pointer"><Edit className="w-3 h-3" /></button>
                                                            <button onClick={() => handleDeleteVocab(v.id)} className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 py-1">
                                            {kunyomiVocab.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-red-50/80 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg sticky top-0 bg-white dark:bg-slate-800 z-10">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                                                            Kun yomi (Âm Kun)
                                                        </span>
                                                        <span className="text-[10px] font-bold text-red-600 dark:text-red-500/80 ml-auto">({kunyomiVocab.length})</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {kunyomiVocab.map((v, i) => renderVocabCardItem(v, i, 'Kunyomi'))}
                                                    </div>
                                                </div>
                                            )}
                                            {onyomiVocab.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-50/80 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 rounded-lg sticky top-0 bg-white dark:bg-slate-800 z-10">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                                                            On yomi (Âm On)
                                                        </span>
                                                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-500/80 ml-auto">({onyomiVocab.length})</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {onyomiVocab.map((v, i) => renderVocabCardItem(v, i, 'Onyomi'))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Full width button - Duolingo 3D */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => setShowAddVocabModal(true)} 
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all select-none"
                                >
                                    <Plus className="w-4 h-4 stroke-[3]" /> Thêm từ vựng
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

    if (isFullPage) {
        return (
            <div className="w-full min-h-screen pt-[calc(3.75rem+env(safe-area-inset-top,0px))] p-3 sm:p-6 lg:p-8 bg-gradient-to-br from-emerald-50/95 via-white/95 to-sky-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                <div className="w-full max-w-[1400px]">
                    {content}
                </div>
            </div>
        );
    }

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fade-in overflow-hidden">
            <div className="w-full max-w-[96vw] lg:max-w-[1420px] h-[92vh] sm:h-auto sm:max-h-[92vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col p-3.5 sm:p-5 overflow-hidden my-auto">
                {content}
            </div>
        </div>,
        document.body
    );
};

export default KanjiDetailView;
