import React, { useState, useMemo } from 'react';
import { Sparkles, Check, X, AlertTriangle, Save, Zap } from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { aiBatchFormatKanji } from '../../utils/aiProvider';
import { showToast } from '../../utils/toast';
import { RADICALS_214 } from '../../data/radicals214';

const BATCH_SIZE = 10;

const KanjiAIFormatTool = ({ kanjiList, setKanjiList, onClose }) => {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState({}); // character -> {meaning, sinoViet}
    const [saved, setSaved] = useState(new Set());
    const [errors, setErrors] = useState([]);
    const [processedCount, setProcessedCount] = useState(0);
    const [selectedLevel, setSelectedLevel] = useState('ALL');

    // Build a map of kanji in Firebase by character
    const kanjiMap = useMemo(() => {
        const map = new Map();
        kanjiList.forEach(k => { if (k.character) map.set(k.character, k); });
        return map;
    }, [kanjiList]);

    // Build list of radicals (from static data, merged with Firebase if exists)
    const radicalItems = useMemo(() => {
        return Object.entries(RADICALS_214).map(([char, data]) => {
            const fbData = kanjiMap.get(char);
            if (fbData) {
                // Radical exists in Firebase - use Firebase data for analysis
                return { ...fbData, _isRadical: true };
            } else {
                // Radical NOT in Firebase - create a virtual entry (will need to be added)
                return {
                    id: null, // no firebase doc
                    character: char,
                    meaning: data.meaning || '',
                    sinoViet: data.name ? data.name.toUpperCase() : '',
                    level: 'Bộ thủ',
                    _isRadical: true,
                    _staticData: data, // keep reference to static data
                    _notInFirebase: true,
                };
            }
        });
    }, [kanjiMap]);

    // Detect all issues for a kanji/radical
    const analyzeKanji = (k) => {
        const meaning = k.meaning || '';
        const sinoViet = k.sinoViet || '';
        const issues = [];

        // 1. Duplicate meaning
        const meaningParts = meaning.split(/[,，、;；]/g).map(s => s.trim().toLowerCase()).filter(Boolean);
        const uniqueMeanings = [...new Set(meaningParts)];
        if (meaningParts.length > 0 && uniqueMeanings.length < meaningParts.length) issues.push('LẶP');

        // 2. Long meaning (more than 4 parts)
        if (meaningParts.length > 4) issues.push('DÀI');

        // 3. Multiple sinoViet (more than 2)
        const svParts = sinoViet.split(/[,，、]/g).map(s => s.trim()).filter(Boolean);
        if (svParts.length > 2) issues.push('HV');

        // 4. Missing sinoViet
        const svTrimmed = sinoViet.trim();
        if (!svTrimmed || svTrimmed === '-' || svTrimmed === '—' || svTrimmed === '–') issues.push('THIẾU_HV');

        // 5. Missing meaning
        const meaningTrimmed = meaning.trim();
        if (!meaningTrimmed || meaningTrimmed === '-' || meaningTrimmed === '—' || meaningTrimmed === '–' || meaningTrimmed === 'Chưa có thông tin') issues.push('THIẾU_NGHĨA');

        // 6. Not in Firebase (radical only)
        if (k._notInFirebase) issues.push('CHƯA_CÓ');

        return issues;
    };

    // Get all items with issues
    const problematicKanji = useMemo(() => {
        let items;

        if (selectedLevel === 'Bộ thủ') {
            // Show radicals (from static data merged with Firebase)
            items = radicalItems;
        } else if (selectedLevel === 'ALL') {
            // All Firebase kanji + radicals not in Firebase
            const fbItems = kanjiList.filter(k => k.id && k.character);
            // Add radicals that are NOT already in Firebase
            const missingRadicals = radicalItems.filter(r => r._notInFirebase);
            items = [...fbItems, ...missingRadicals];
        } else {
            items = kanjiList.filter(k => k.id && k.character && k.level === selectedLevel);
        }

        return items
            .map(k => ({ ...k, _issues: analyzeKanji(k) }))
            .filter(k => k._issues.length > 0);
    }, [kanjiList, selectedLevel, radicalItems]);

    // Stats
    const issueStats = useMemo(() => {
        let dup = 0, long = 0, hv = 0, missingHv = 0, missingMeaning = 0, notInDb = 0;
        problematicKanji.forEach(k => {
            if (k._issues.includes('LẶP')) dup++;
            if (k._issues.includes('DÀI')) long++;
            if (k._issues.includes('HV')) hv++;
            if (k._issues.includes('THIẾU_HV')) missingHv++;
            if (k._issues.includes('THIẾU_NGHĨA')) missingMeaning++;
            if (k._issues.includes('CHƯA_CÓ')) notInDb++;
        });
        return { dup, long, hv, missingHv, missingMeaning, notInDb, total: problematicKanji.length };
    }, [problematicKanji]);

    // Available levels - always include Bộ thủ
    const availableLevels = useMemo(() => {
        const levels = new Set();
        kanjiList.forEach(k => { if (k.level) levels.add(k.level); });
        const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'].filter(l => levels.has(l));
        return ['ALL', ...jlptLevels, 'Bộ thủ'];
    }, [kanjiList]);

    // Fix all problematic kanji (only those with Firebase-fixable issues)
    const handleFixAll = async () => {
        // Filter out items that need AI (exclude CHƯA_CÓ-only items since they need to be created first)
        const fixable = problematicKanji.filter(k => {
            const hasDataIssues = k._issues.some(i => i !== 'CHƯA_CÓ');
            return hasDataIssues || k._notInFirebase; // include not-in-firebase too, AI will provide data
        });

        if (fixable.length === 0) return;
        setProcessing(true);
        setResults({});
        setSaved(new Set());
        setErrors([]);
        setProcessedCount(0);

        const allResults = {};
        const total = fixable.length;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = fixable.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(total / BATCH_SIZE);

            try {
                const items = batch.map(k => ({
                    character: k.character,
                    meaning: k.meaning || '',
                    sinoViet: k.sinoViet || '',
                }));

                const aiResults = await aiBatchFormatKanji(items);

                if (aiResults && Array.isArray(aiResults)) {
                    for (const r of aiResults) {
                        if (r.character) {
                            allResults[r.character] = {
                                meaning: r.meaning || '',
                                sinoViet: r.sinoViet || '',
                                _notInFirebase: batch.find(b => b.character === r.character)?._notInFirebase || false,
                            };
                        }
                    }
                    setResults({ ...allResults });
                    setProcessedCount(Math.min(i + BATCH_SIZE, total));
                } else {
                    setErrors(prev => [...prev, `Batch ${batchNum}/${totalBatches}: AI trả về không hợp lệ`]);
                }
            } catch (e) {
                console.error('AI Format error:', e);
                setErrors(prev => [...prev, `Batch ${batchNum}: ${e.message}`]);
            }

            if (i + BATCH_SIZE < total) {
                await new Promise(r => setTimeout(r, 800));
            }
        }

        setProcessing(false);
        showToast(`✅ Đã xử lý xong ${total} chữ có lỗi!`, 'success');
    };

    const saveOneItem = async (character, data) => {
        const kanjiDoc = kanjiList.find(k => k.character === character);

        if (kanjiDoc?.id) {
            // Update existing document
            const updates = {};
            if (data.meaning) updates.meaning = data.meaning;
            if (data.sinoViet) updates.sinoViet = data.sinoViet;

            await updateDoc(doc(db, 'kanji', kanjiDoc.id), updates);
            setKanjiList(prev => prev.map(k =>
                k.id === kanjiDoc.id ? { ...k, ...updates } : k
            ));
        } else {
            // Create new document (radical not in Firebase)
            const radicalData = RADICALS_214[character];
            const newDoc = {
                character,
                meaning: data.meaning || radicalData?.meaning || '',
                sinoViet: data.sinoViet || (radicalData?.name || '').toUpperCase(),
                level: 'Bộ thủ',
                onyomi: '',
                kunyomi: '',
                mnemonic: '',
                strokeCount: String(radicalData?.stroke_count || radicalData?.strokes || ''),
            };
            const docRef = await addDoc(collection(db, 'kanji'), newDoc);
            setKanjiList(prev => [...prev, { ...newDoc, id: docRef.id }]);
        }
    };

    const handleSaveAll = async () => {
        const toSave = Object.entries(results).filter(([char]) => !saved.has(char));
        if (toSave.length === 0) {
            showToast('Không có thay đổi nào cần lưu', 'warning');
            return;
        }

        setProcessing(true);
        let savedCount = 0;
        const newSaved = new Set(saved);

        for (const [character, data] of toSave) {
            try {
                await saveOneItem(character, data);
                newSaved.add(character);
                savedCount++;
            } catch (e) {
                console.error(`Error saving ${character}:`, e);
            }
        }

        setSaved(newSaved);
        setProcessing(false);
        showToast(`✅ Đã lưu ${savedCount} chữ!`, 'success');
    };

    const handleSaveOne = async (character) => {
        const data = results[character];
        if (!data) return;

        try {
            await saveOneItem(character, data);
            setSaved(prev => new Set([...prev, character]));
            showToast(`✅ Đã lưu ${character}`, 'success');
        } catch (e) {
            showToast(`❌ Lỗi: ${e.message}`, 'error');
        }
    };

    const resultEntries = Object.entries(results);

    // Issue badge component
    const IssueBadge = ({ type }) => {
        const config = {
            'LẶP': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-500', label: 'LẶP' },
            'DÀI': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-500', label: 'DÀI' },
            'HV': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600', label: 'HV' },
            'THIẾU_HV': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-500', label: 'THIẾU HV' },
            'THIẾU_NGHĨA': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-500', label: 'THIẾU NGHĨA' },
            'CHƯA_CÓ': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-500', label: 'CHƯA CÓ DB' },
        };
        const c = config[type] || { bg: 'bg-gray-100', text: 'text-gray-500', label: type };
        return <span className={`px-1.5 py-0.5 ${c.bg} ${c.text} text-[10px] rounded font-bold`}>{c.label}</span>;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">AI Format Kanji & Bộ thủ</h2>
                                <p className="text-xs text-gray-500">Phát hiện & sửa lỗi: nghĩa lặp/dài, âm HV thừa/thiếu, bộ thủ chưa có DB</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Level filter */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {availableLevels.map(lv => (
                            <button key={lv} onClick={() => { setSelectedLevel(lv); setResults({}); setSaved(new Set()); setErrors([]); setProcessedCount(0); }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedLevel === lv
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    }`}>
                                {lv === 'ALL' ? 'Tất cả' : lv}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Issue summary cards */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                            { label: 'Nghĩa LẶP', value: issueStats.dup, color: 'text-red-500', border: 'border-red-200 dark:border-red-800/50', bg: 'bg-red-50 dark:bg-red-900/20' },
                            { label: 'Nghĩa DÀI', value: issueStats.long, color: 'text-orange-500', border: 'border-orange-200 dark:border-orange-800/50', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                            { label: 'Nhiều HV', value: issueStats.hv, color: 'text-yellow-600', border: 'border-yellow-200 dark:border-yellow-800/50', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                            { label: 'Thiếu HV', value: issueStats.missingHv, color: 'text-purple-500', border: 'border-purple-200 dark:border-purple-800/50', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                            { label: 'Thiếu nghĩa', value: issueStats.missingMeaning, color: 'text-pink-500', border: 'border-pink-200 dark:border-pink-800/50', bg: 'bg-pink-50 dark:bg-pink-900/20' },
                            { label: 'Chưa có DB', value: issueStats.notInDb, color: 'text-blue-500', border: 'border-blue-200 dark:border-blue-800/50', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-2.5 text-center`}>
                                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-[9px] text-gray-500 font-bold mt-0.5 leading-tight">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Main action */}
                    <div className="flex gap-2 flex-wrap items-center">
                        <button
                            onClick={handleFixAll}
                            disabled={processing || problematicKanji.length === 0}
                            className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/25"
                        >
                            {processing ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang sửa {processedCount}/{problematicKanji.length}...</>
                            ) : (
                                <><Zap className="w-4 h-4" /> Sửa {problematicKanji.length} chữ bị lỗi</>
                            )}
                        </button>
                        {resultEntries.length > 0 && (
                            <button
                                onClick={handleSaveAll}
                                disabled={processing}
                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25"
                            >
                                <Save className="w-4 h-4" /> Lưu tất cả ({resultEntries.length - saved.size} chưa lưu)
                            </button>
                        )}
                        {problematicKanji.length > 0 && !processing && resultEntries.length === 0 && (
                            <span className="text-xs text-gray-400">
                                ≈ {Math.ceil(problematicKanji.length / BATCH_SIZE)} lần gọi AI
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    {processing && (
                        <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500"
                                style={{ width: `${(processedCount / problematicKanji.length) * 100}%` }} />
                        </div>
                    )}

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                            <div className="flex items-center gap-1 text-xs text-red-500 font-bold mb-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Lỗi
                            </div>
                            {errors.slice(-3).map((e, i) => (
                                <p key={i} className="text-xs text-red-400">{e}</p>
                            ))}
                        </div>
                    )}

                    {/* Results table */}
                    {resultEntries.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Kết quả AI ({resultEntries.length} chữ)</p>
                            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-700/50">
                                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 w-14">Chữ</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400">Ý nghĩa (Cũ → Mới)</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 w-32">HV (Cũ → Mới)</th>
                                            <th className="px-3 py-2 w-14"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultEntries.map(([char, data]) => {
                                            const original = kanjiList.find(k => k.character === char);
                                            const isSaved = saved.has(char);
                                            const oldMeaning = original?.meaning || '';
                                            const oldSV = original?.sinoViet || '';
                                            const meaningChanged = data.meaning !== oldMeaning;
                                            const svChanged = data.sinoViet !== oldSV;
                                            const isNew = data._notInFirebase;
                                            return (
                                                <tr key={char} className={`border-t border-gray-100 dark:border-slate-700/50 ${isSaved ? 'opacity-40' : ''}`}>
                                                    <td className="px-3 py-2">
                                                        <div className="text-2xl font-bold text-center font-japanese">{char}</div>
                                                        {isNew && <div className="text-[9px] text-blue-500 text-center font-bold">MỚI</div>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {meaningChanged ? (
                                                            <div>
                                                                <div className="text-red-400 line-through text-xs">{oldMeaning || '(trống)'}</div>
                                                                <div className="text-emerald-500 font-medium text-xs">{data.meaning}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">{data.meaning || '-'} ✓</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {svChanged ? (
                                                            <div>
                                                                <div className="text-red-400 line-through text-xs">{oldSV || '(trống)'}</div>
                                                                <div className="text-cyan-500 font-bold text-xs">{data.sinoViet}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-cyan-400 text-xs font-bold">{data.sinoViet || '-'} ✓</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {isSaved ? (
                                                            <Check className="w-4 h-4 text-emerald-500 inline" />
                                                        ) : (
                                                            <button onClick={() => handleSaveOne(char)}
                                                                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                                title="Lưu chữ này">
                                                                <Save className="w-4 h-4 text-emerald-500" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Preview problematic items */
                        problematicKanji.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                    Phát hiện {problematicKanji.length} chữ có lỗi
                                </p>
                                <div className="max-h-[350px] overflow-y-auto space-y-1 rounded-xl border border-gray-200 dark:border-slate-700 p-2">
                                    {problematicKanji.map((k, idx) => (
                                        <div key={k.id || `radical-${idx}`} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                                            <span className="text-xl font-bold font-japanese w-8 text-center flex-shrink-0">{k.character}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                                    <span className="text-gray-400">Nghĩa:</span> {k.meaning || <span className="text-pink-400 italic">(trống)</span>}
                                                </div>
                                                <div className="text-xs text-cyan-500 truncate">
                                                    <span className="text-gray-400">HV:</span> {k.sinoViet || <span className="text-purple-400 italic">(trống)</span>}
                                                </div>
                                                {k.level && <span className="text-[9px] text-gray-400">{k.level}</span>}
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end max-w-[160px]">
                                                {k._issues.map(issue => <IssueBadge key={issue} type={issue} />)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                    Không phát hiện lỗi nào! 🎉
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Tất cả {selectedLevel !== 'ALL' ? `${selectedLevel} ` : ''}Kanji & bộ thủ đều sạch
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default KanjiAIFormatTool;
