import React, { useEffect, useState, useCallback } from 'react';
import { 
    ArrowLeft, RotateCcw, Check, Bookmark, Edit, Trash2, 
    Layers, Tag, Volume2, Plus 
} from 'lucide-react';
import { renderMaziiStyleKanji, renderStrokeGuide } from '../../utils/kanjiStroke';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';
import { playAudio } from '../../utils/audio';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';
import { KANJI_TREE } from '../../data/radicals214';
import kanjiComponents from '../../data/kanjiComponents.json' with { type: 'json' };

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
    strokeGuideRef,
    onAddVocabToSRS,
    addedVocabIds,
    allUserCards,
    addingVocabId,
    handleAddVocabToSRS,
    openEditVocab,
    handleDeleteVocab,
    setShowAddVocabModal,
    diagramPan,
    setDiagramPan,
    setDiagramZoom
}) => {
    const detail = selectedKanji ? getKanjiDetail(selectedKanji) : null;
    const vocab = selectedKanji ? getVocabForKanji(selectedKanji) : [];

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

        if (strokeGuideRef?.current) {
            renderStrokeGuide(strokeGuideRef.current, selectedKanji);
        }

        return () => {
            isMounted = false;
        };
    }, [selectedKanji, detailWriterContainerRef, strokeGuideRef, detailStrokeCtrl]);

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

    // Render pitch accent inline for a vocab word (single source of reading display)
    const renderVocabPitch = useCallback((v) => {
        const jotobaData = pitchAccentData[v.word];
        const reading = v.reading || jotobaData?.reading || null;
        if (!reading) return null;

        const storedPitch = v.accent !== undefined && v.accent !== '' && v.accent !== null
            ? accentNumberToPitchParts(reading, v.accent)
            : null;
        const pitchParts = v.pitch || storedPitch || jotobaData?.pitch || null;

        // If no pitch data, show plain reading in parentheses
        if (!pitchParts || pitchParts.length === 0) {
            return (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-japanese ml-0.5">（{reading}）</span>
            );
        }

        // Build pitch accent visualization
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

    if (!selectedKanji) return null;

    const content = (
        <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
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
                    className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
                <div className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                    Chi tiết Kanji
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                {/* Left: Kanji Display with Animation */}
                <div className="space-y-4 lg:h-full lg:overflow-y-auto pr-1">
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-6 aspect-square flex items-center justify-center relative shadow-2xl shadow-indigo-100/50 dark:shadow-black/30 overflow-hidden">
                        <div
                            key={`kanji-display-${selectedKanji}`}
                            ref={detailWriterContainerRef}
                            className="w-full h-full flex items-center justify-center"
                        />
                        <button
                            onClick={() => detailStrokeCtrl.current?.replay()}
                            className="absolute bottom-3 right-3 p-2.5 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 rounded-xl text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 cursor-pointer"
                            title="Xem lại nét vẽ"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-orange-500/30">
                            {kanjiApiData?.stroke_count || detail.strokeCount || '?'} nét
                        </div>
                    </div>

                    {/* Stroke Order Guide Strip */}
                    <div className="bg-gray-100 dark:bg-slate-900 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5 px-1 font-medium">Hướng dẫn nét viết</p>
                        <div
                            ref={strokeGuideRef}
                            className="flex flex-wrap gap-1 pb-1"
                        />
                    </div>
                </div>

                {/* Center: Kanji Info */}
                <div className="space-y-4 lg:h-full lg:overflow-y-auto pr-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white font-japanese">{selectedKanji}</span>
                        <span className="text-2xl text-gray-400">-</span>
                        <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{detail.sinoViet || ''}</span>
                        {(() => {
                            const kanjiDoc = kanjiMap.get(selectedKanji);
                            const isSRSAdded = kanjiDoc ? userKanjiSRS.has(kanjiDoc.id) : false;
                            return (
                                <button
                                    onClick={(e) => !isSRSAdded && toggleKanjiSRS(e, selectedKanji)}
                                    disabled={isSRSAdded}
                                    className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm border cursor-pointer ${isSRSAdded
                                        ? 'bg-emerald-500 text-white border-transparent cursor-default'
                                        : 'bg-white hover:bg-gray-50 text-gray-750 border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-slate-700'
                                        }`}
                                >
                                    {isSRSAdded ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Đã lưu
                                        </>
                                    ) : (
                                        <>
                                            <Bookmark className="w-3.5 h-3.5" />
                                            Thêm Kanji Vào Học
                                        </>
                                    )}
                                </button>
                            );
                        })()}
                        {isAdmin && (
                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={() => openEditKanji(detail)}
                                    className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                    title="Chỉnh sửa kanji"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                {detail.id && (
                                    <button
                                        onClick={() => { handleDeleteKanji(detail.id); setShowDetailModal(false); navigate('/kanji/list'); }}
                                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                        title="Xóa kanji"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2.5 text-sm bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                        <p><span className="text-gray-500 dark:text-gray-400">Ý nghĩa:</span> <span className="text-orange-500 dark:text-orange-400 font-medium text-base">{detail.meaning || getJotobaKanjiData(selectedKanji)?.meaningVi || '-'}</span></p>
                        <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                            <div className="space-y-2.5 flex-1 min-w-0 w-full">
                                <p><span className="text-gray-500 dark:text-gray-400">Trình độ JLPT:</span> <span className="text-gray-900 dark:text-white font-medium">{detail.level || (kanjiApiData?.jlpt ? `N${kanjiApiData.jlpt}` : '-')}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Số nét:</span> <span className="text-gray-900 dark:text-white font-bold">{detail.strokeCount || kanjiApiData?.stroke_count || getJotobaKanjiData(selectedKanji)?.stroke_count || '?'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm Kun:</span> <span className="text-red-500 dark:text-red-400 font-japanese font-bold">{detail.kunyomi || (kanjiApiData?.kunyomi?.join('、')) || getJotobaKanjiData(selectedKanji)?.kunyomi?.join('、') || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm On:</span> <span className="text-cyan-600 dark:text-cyan-400 font-japanese font-bold">{detail.onyomi || (kanjiApiData?.onyomi?.join('、')) || getJotobaKanjiData(selectedKanji)?.onyomi?.join('、') || '-'}</span></p>
                                {(() => {
                                    const parts = kanjiComponents[selectedKanji] || detail.parts || kanjiApiData?.parts || getJotobaKanjiData(selectedKanji)?.parts || [];
                                    if (parts.length === 0) return null;
                                    const partsArr = typeof parts === 'string' ? parts.split(/[,，、]/).filter(Boolean) : parts;
                                    return (
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Thành phần:</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {partsArr.map((p, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setSelectedKanji(p); setDiagramPan({ x: 0, y: 0 }); setDiagramZoom(1); }}
                                                        className="px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg text-base font-japanese hover:bg-sky-200 dark:hover:bg-sky-800/50 transition-colors cursor-pointer"
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            {detail.imageUrl && (
                                <div className="w-full sm:w-40 sm:h-40 md:w-48 md:h-48 shrink-0 bg-slate-50 dark:bg-slate-900/40 rounded-2xl overflow-hidden border border-gray-250 dark:border-slate-700 flex items-center justify-center p-1.5 group shadow-inner">
                                    <img src={detail.imageUrl} alt={detail.character} className="max-w-full max-h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            )}
                        </div>
                        {detail.mnemonic && (
                            <p className="pt-1 border-t border-gray-100 dark:border-slate-700"><span className="text-gray-500 dark:text-gray-400">💡 Cách nhớ:</span> <span className="text-gray-900 dark:text-white">{detail.mnemonic}</span></p>
                        )}
                    </div>

                    {/* Radical Breakdown */}
                    <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Thành phần bộ thủ
                        </h4>
                        <div className="relative bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden p-6" style={{ minHeight: '280px' }}>
                            {loadingApiData ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                                </div>
                            ) : (() => {
                                const parseRads = (str) => {
                                    if (!str) return [];
                                    if (Array.isArray(str)) return str.map(s => String(s).trim()).filter(Boolean);
                                    const strVal = String(str);
                                    const withoutParens = strVal.replace(/[（(][^)）]*[)）]/g, '');
                                    return withoutParens.split(/[,，、\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                                };
                                const det = getKanjiDetail(selectedKanji);
                                const parts = kanjiComponents[selectedKanji] || det.parts || kanjiApiData?.parts || getJotobaKanjiData(selectedKanji)?.parts || [];
                                const partsArr = (typeof parts === 'string' ? parseRads(parts) : parts).filter(p => p !== selectedKanji);
                                const resultKanji = [
                                    ...Object.entries(KANJI_TREE)
                                        .filter(([k, v]) => v.components?.includes(selectedKanji) && k !== selectedKanji)
                                        .map(([k]) => k),
                                    ...kanjiList
                                        .filter(k => {
                                            if (k.character === selectedKanji) return false;
                                            const rads = parseRads(k.radical || '');
                                            const customParts = kanjiComponents[k.character];
                                            const kParts = customParts ? customParts : parseRads(k.parts || '');
                                            return rads.includes(selectedKanji) || kParts.includes(selectedKanji);
                                        })
                                        .map(k => k.character)
                                ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);

                                if (partsArr.length === 0 && resultKanji.length === 0) {
                                    return <p className="text-center text-gray-400 dark:text-gray-500 py-8">Không có dữ liệu thành phần</p>;
                                }

                                return (
                                    <div className="flex flex-col items-center gap-4">
                                        {partsArr.length > 0 && (
                                            <>
                                                <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold">Cấu tạo từ</span>
                                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                                    {partsArr.map((p, i) => (
                                                        <button key={i} onClick={() => { navigate(`/kanji/list/${p}`); setSelectedKanji(p); }} className="group relative cursor-pointer">
                                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 border-2 border-sky-200 dark:border-sky-700/50 flex items-center justify-center text-2xl font-japanese text-sky-700 dark:text-sky-300 hover:scale-110 transition-all">
                                                                {p}
                                                            </div>
                                                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-sky-500 dark:text-sky-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {kanjiMap.get(p)?.sinoViet || getJotobaKanjiData(p)?.sinoViet || ''}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-2xl shadow-cyan-500/30 dark:shadow-cyan-900/50 flex items-center justify-center">
                                                <span className="text-5xl font-japanese text-white font-bold drop-shadow-lg">{selectedKanji}</span>
                                            </div>
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shadow-sm whitespace-nowrap">
                                                {det.sinoViet || ''}
                                            </div>
                                        </div>
                                        {resultKanji.length > 0 && (
                                            <>
                                                <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mt-2">Tạo thành</span>
                                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                                    {resultKanji.map((k, i) => (
                                                        <button key={i} onClick={() => { navigate(`/kanji/list/${k}`); setSelectedKanji(k); }} className="group relative cursor-pointer">
                                                            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center text-lg font-japanese text-emerald-700 dark:text-emerald-300 hover:scale-110 transition-all">
                                                                {k}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Right: Vocabulary List */}
                <div className="flex flex-col gap-4 bg-white dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700 lg:h-full lg:overflow-hidden">
                    <div className="flex justify-between items-center">
                        <h3 className="text-orange-500 dark:text-orange-400 font-medium flex items-center gap-1.5">
                            <Tag className="w-4 h-4" /> Từ vựng ({vocab.length})
                        </h3>
                    </div>
                    {(() => {
                        if (vocab.length === 0) {
                            return <p className="text-gray-400 dark:text-gray-500 text-center py-4">Chưa có từ vựng</p>;
                        }

                        const kunyomiVocab = [];
                        const onyomiVocab = [];
                        for (const v of vocab) {
                            const rType = getVocabReadingType(v);
                            if (rType === 'Kunyomi') {
                                kunyomiVocab.push(v);
                            } else {
                                onyomiVocab.push(v);
                            }
                        }

                        const renderVocabCardItem = (v, i, rType) => {
                            const wordClean = (v.word || '').split('（')[0].split('(')[0].trim();
                            return (
                                <div key={v.id || i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-lg border border-gray-200 dark:border-slate-700/50">
                                    <div className="flex-1 min-w-0 flex flex-col gap-1 text-sm">
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                            <span className={`font-japanese font-bold text-base ${rType === 'Kunyomi' ? 'text-red-500 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                                {wordClean}
                                            </span>
                                            {renderVocabPitch(v)}
                                            {v.sinoViet && <span className="px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold uppercase rounded ml-1">[{v.sinoViet}]</span>}
                                        </div>
                                        <div className="text-gray-700 dark:text-gray-200 text-xs">{v.meaning}</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {v.audioBase64 && (
                                            <button onClick={() => playAudio(v.audioBase64, v.word)} className="p-1 text-sky-500 hover:text-sky-600 cursor-pointer">
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {onAddVocabToSRS && (
                                            <button onClick={() => handleAddVocabToSRS(v)} className="p-1 text-gray-400 hover:text-sky-500 cursor-pointer" title="Thêm vào học phần">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => openEditVocab(v)} className="p-1 text-gray-400 hover:text-sky-500 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDeleteVocab(v.id)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div className="space-y-4 overflow-y-auto max-h-[500px] lg:max-h-none pr-1">
                                {kunyomiVocab.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl sticky top-0 bg-white dark:bg-slate-800 z-10">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                                                Kun yomi (Âm Kun)
                                            </span>
                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-500/80 ml-auto">({kunyomiVocab.length})</span>
                                        </div>
                                        <div className="space-y-2">
                                            {kunyomiVocab.map((v, i) => renderVocabCardItem(v, i, 'Kunyomi'))}
                                        </div>
                                    </div>
                                )}
                                {onyomiVocab.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 rounded-xl sticky top-0 bg-white dark:bg-slate-800 z-10">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                                                On yomi (Âm On)
                                            </span>
                                            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-500/80 ml-auto">({onyomiVocab.length})</span>
                                        </div>
                                        <div className="space-y-2">
                                            {onyomiVocab.map((v, i) => renderVocabCardItem(v, i, 'Onyomi'))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {isAdmin && (
                        <button onClick={() => setShowAddVocabModal(true)} className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer">
                            <Plus className="w-5 h-5" /> Thêm từ vựng
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    if (isFullPage) {
        return (
            <div className="w-full h-screen p-4 lg:p-8 bg-gradient-to-br from-indigo-50/95 via-white/95 to-sky-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 overflow-hidden">
                {content}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 lg:p-8">
            <div className="w-full max-w-[92vw] lg:max-w-[1550px] h-[90vh] bg-gradient-to-br from-indigo-50/95 via-white/95 to-sky-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {content}
            </div>
        </div>
    );
};

export default KanjiDetailView;
