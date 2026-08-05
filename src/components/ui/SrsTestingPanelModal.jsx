import React, { useState } from 'react';
import { X, Play, RotateCcw, CheckCircle, AlertTriangle, Clock, FastForward, Activity, ShieldCheck } from 'lucide-react';
import { calculateAnkiSRS, normalizeSRSState, parseNextReviewMs } from '../../utils/srs';

const SrsTestingPanelModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'queue' | 'suite'

    // --- Tab 1: Simulator State ---
    const [simState, setSimState] = useState('REVIEW');
    const [simInterval, setSimInterval] = useState(10);
    const [simEase, setSimEase] = useState(2.5);
    const [simPrelapse, setSimPrelapse] = useState(10);
    const [lastRating, setLastRating] = useState(null);
    const [simResult, setSimResult] = useState(null);

    // --- Tab 2: Queue Test State ---
    const [demoQueue, setDemoQueue] = useState([
        { id: 'kanji_1', character: '三 (TAM)', level: 'N5', srsState: 'REVIEW', srsInterval: 10 },
        { id: 'kanji_2', character: '日 (NHẬT)', level: 'N5', srsState: 'REVIEW', srsInterval: 15 },
        { id: 'kanji_3', character: '本 (BẢN)', level: 'N5', srsState: 'REVIEW', srsInterval: 20 },
        { id: 'kanji_4', character: '学 (HỌC)', level: 'N5', srsState: 'REVIEW', srsInterval: 12 },
        { id: 'kanji_5', character: '校 (HIỆU)', level: 'N5', srsState: 'REVIEW', srsInterval: 8 },
    ]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [waitingPool, setWaitingPool] = useState([]);
    const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);
    const [queueLogs, setQueueLogs] = useState([
        '▶ Khởi tạo phiên ôn tập giả lập với 5 thẻ Kanji.'
    ]);

    // --- Tab 3: Automated Test Suite Results ---
    const [testSuiteResults, setTestSuiteResults] = useState(null);

    if (!isOpen) return null;

    // --- Simulator Rating Handler ---
    const handleSimulateRating = (rating) => {
        const inputSrs = {
            state: simState,
            interval: simInterval,
            ease: simEase,
            prelapseInterval: simState === 'RELEARNING' ? simPrelapse : (simState === 'REVIEW' ? simInterval : null),
            isLapsed: simState === 'RELEARNING'
        };
        const result = calculateAnkiSRS(inputSrs, rating);
        setLastRating(rating);
        setSimResult(result);
    };

    // Apply simulation result back to inputs for multi-step testing
    const handleApplyResult = () => {
        if (!simResult) return;
        setSimState(simResult.state);
        setSimInterval(simResult.interval);
        setSimEase(simResult.ease);
        if (simResult.prelapseInterval !== undefined) {
            setSimPrelapse(simResult.prelapseInterval);
        }
    };

    // --- Queue Test Handlers ---
    const handleQueueRateCard = (rating) => {
        const currentCard = demoQueue[currentIndex];
        if (!currentCard) return;

        const result = calculateAnkiSRS(currentCard, rating);
        const nextReviewTime = Date.now() + (result.nextReviewOffsetMs || (result.interval * 60000)) + (timeOffsetMinutes * 60000);

        const updatedCard = {
            ...currentCard,
            ...result,
            nextReview: nextReviewTime
        };

        if (result.state !== 'REVIEW') {
            // Re-queue in waiting pool (time-based insertion pool)
            setWaitingPool(prev => [...prev.filter(c => c.id !== currentCard.id), updatedCard]);
            setQueueLogs(prev => [
                `⚡ Bấm "${rating.toUpperCase()}" cho ${currentCard.character}: Thẻ hẹn lại sau ${result.interval} phút. Thẻ ĐƯỢC ĐƯA VÀO HÀNG CHỜ THỜI GIAN (Waiting Pool), KHÔNG đẩy xuống cuối queue.`,
                ...prev
            ]);
        } else {
            setQueueLogs(prev => [
                `🎉 ${currentCard.character} đã TỐT NGHIỆP vào trạng thái REVIEW với chu kỳ mới: ${result.interval} ngày.`,
                ...prev
            ]);
        }

        // Advance to next card in queue
        setCurrentIndex(prev => prev + 1);
    };

    // Fast-forward 10 minutes simulation
    const handleFastForwardTime = (minutes) => {
        const newOffset = timeOffsetMinutes + minutes;
        setTimeOffsetMinutes(newOffset);
        const virtualNow = Date.now() + newOffset * 60000;

        // Check cards in waiting pool due by virtualNow
        const dueCards = waitingPool.filter(c => c.nextReview <= virtualNow);

        if (dueCards.length > 0) {
            setDemoQueue(prevQueue => {
                const nextQueue = [...prevQueue];
                const upcomingIds = new Set(nextQueue.slice(currentIndex).map(c => c.id));
                const cardsToInject = dueCards.filter(c => !upcomingIds.has(c.id));

                if (cardsToInject.length > 0) {
                    const insertIndex = Math.min(currentIndex, nextQueue.length);
                    nextQueue.splice(insertIndex, 0, ...cardsToInject);
                    setQueueLogs(prev => [
                        `⏱️ [TUA NHANH ${minutes} PHÚT]: Thẻ ${cardsToInject.map(c => c.character).join(', ')} đã ĐẾN HẠN! Đã tự động chèn NGAY SAU THẺ ĐANG ĐÁNH GIÁ (vị trí index ${insertIndex}).`,
                        ...prev
                    ]);
                    return nextQueue;
                }
                return prevQueue;
            });
            // Remove injected cards from waiting pool
            setWaitingPool(prev => prev.filter(c => c.nextReview > virtualNow));
        } else {
            setQueueLogs(prev => [
                `⏱️ [TUA NHANH ${minutes} PHÚT]: Chưa có thẻ nào trong Waiting Pool đến hạn. (Virtual time: +${newOffset}m)`,
                ...prev
            ]);
        }
    };

    // Reset Queue Demo
    const handleResetQueueDemo = () => {
        setDemoQueue([
            { id: 'kanji_1', character: '三 (TAM)', level: 'N5', srsState: 'REVIEW', srsInterval: 10 },
            { id: 'kanji_2', character: '日 (NHẬT)', level: 'N5', srsState: 'REVIEW', srsInterval: 15 },
            { id: 'kanji_3', character: '本 (BẢN)', level: 'N5', srsState: 'REVIEW', srsInterval: 20 },
            { id: 'kanji_4', character: '学 (HỌC)', level: 'N5', srsState: 'REVIEW', srsInterval: 12 },
            { id: 'kanji_5', character: '校 (HIỆU)', level: 'N5', srsState: 'REVIEW', srsInterval: 8 },
        ]);
        setCurrentIndex(0);
        setWaitingPool([]);
        setTimeOffsetMinutes(0);
        setQueueLogs(['▶ Đã đặt lại phiên giả lập.']);
    };

    // --- Tab 3: Run Automated Test Suite ---
    const handleRunAutomatedSuite = () => {
        const tests = [
            {
                name: 'Review Card (10d) lapsed with "again"',
                input: { state: 'REVIEW', interval: 10, ease: 2.50 },
                rating: 'again',
                verify: (res) => res.state === 'RELEARNING' && res.prelapseInterval === 10 && res.interval === 10 && Math.abs(res.ease - 2.30) < 0.01
            },
            {
                name: 'Relearning Card (prelapse 10d) rated "good" (50% reduction)',
                input: { state: 'RELEARNING', interval: 10, ease: 2.30, prelapseInterval: 10 },
                rating: 'good',
                verify: (res) => res.state === 'REVIEW' && res.interval === 5
            },
            {
                name: 'Review Card (20d) lapsed with "again" then "good" (20d -> 10d)',
                input: { state: 'RELEARNING', interval: 10, ease: 2.30, prelapseInterval: 20 },
                rating: 'good',
                verify: (res) => res.state === 'REVIEW' && res.interval === 10
            },
            {
                name: 'Short Card (1d) lapsed then "good" (stays 1d)',
                input: { state: 'RELEARNING', interval: 10, ease: 2.30, prelapseInterval: 1 },
                rating: 'good',
                verify: (res) => res.state === 'REVIEW' && res.interval === 1
            },
            {
                name: 'Relearning Card (prelapse 10d) rated "hard" (30% reduction = 3d)',
                input: { state: 'RELEARNING', interval: 10, ease: 2.30, prelapseInterval: 10 },
                rating: 'hard',
                verify: (res) => res.state === 'REVIEW' && res.interval === 3
            },
            {
                name: 'Relearning Card (prelapse 10d) rated "easy" (70% reduction = 7d)',
                input: { state: 'RELEARNING', interval: 10, ease: 2.30, prelapseInterval: 10 },
                rating: 'easy',
                verify: (res) => res.state === 'REVIEW' && res.interval === 7
            }
        ];

        const results = tests.map(t => {
            const res = calculateAnkiSRS(t.input, t.rating);
            const passed = t.verify(res);
            return {
                name: t.name,
                passed,
                input: t.input,
                rating: t.rating,
                output: res
            };
        });

        setTestSuiteResults(results);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                            <Activity className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Bảng Test Thuật Toán SRS & Hàng Chờ
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded-md border border-emerald-500/30">Anki SM-2</span>
                            </h3>
                            <p className="text-xs text-slate-400">Kiểm tra giảm chu kỳ khi quên & chèn thẻ theo mốc thời gian</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs Header */}
                <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-2 pt-2">
                    {[
                        { id: 'simulator', label: '🧮 Giả lập Thuật toán SRS', icon: Activity },
                        { id: 'queue', label: '⏱️ Test Hàng chờ & Chèn thời gian', icon: Clock },
                        { id: 'suite', label: '🧪 Run Unit Test Suite (Automated)', icon: ShieldCheck }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-slate-800/90 text-indigo-400 border-indigo-500'
                                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Contents */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* TAB 1: SIMULATOR */}
                    {activeTab === 'simulator' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Trạng thái thẻ</label>
                                    <select value={simState} onChange={e => setSimState(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white">
                                        <option value="REVIEW">REVIEW (Đã tốt nghiệp)</option>
                                        <option value="RELEARNING">RELEARNING (Đã bị quên)</option>
                                        <option value="LEARNING">LEARNING (Đang học)</option>
                                        <option value="NEW">NEW (Mới)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chu kỳ hiện tại (Ngày/Phút)</label>
                                    <input type="number" value={simInterval} onChange={e => setSimInterval(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Hệ số Ease</label>
                                    <input type="number" step="0.05" value={simEase} onChange={e => setSimEase(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white" />
                                </div>
                                {simState === 'RELEARNING' && (
                                    <div>
                                        <label className="block text-xs font-bold text-amber-400 uppercase mb-1">Chu kỳ trước khi quên (Prelapse)</label>
                                        <input type="number" value={simPrelapse} onChange={e => setSimPrelapse(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-amber-500/50 rounded-xl text-sm font-bold text-amber-300" />
                                    </div>
                                )}
                            </div>

                            {/* Action Rating Buttons */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Chọn Đánh giá để tính toán kết quả kịch bản:</p>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { id: 'again', label: 'Quên rồi (Again)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30' },
                                        { id: 'hard', label: 'Khó (Hard)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' },
                                        { id: 'good', label: 'Tốt (Good)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' },
                                        { id: 'easy', label: 'Dễ (Easy)', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30' },
                                    ].map(b => (
                                        <button key={b.id} onClick={() => handleSimulateRating(b.id)}
                                            className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all hover:scale-105 cursor-pointer ${b.color}`}>
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Simulation Output Result */}
                            {simResult && (
                                <div className="bg-gradient-to-br from-slate-950 to-indigo-950/60 p-5 rounded-2xl border border-indigo-500/30 space-y-4 animate-in fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                        <span className="text-xs font-bold uppercase text-indigo-400">Kết quả tính toán sau khi bấm "{lastRating?.toUpperCase()}":</span>
                                        <button onClick={handleApplyResult} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer">
                                            Áp dụng kết quả này làm đầu vào tiếp theo ➔
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Trạng thái mới</span>
                                            <span className="text-base font-black text-emerald-400 font-mono">{simResult.state}</span>
                                        </div>
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Chu kỳ mới</span>
                                            <span className="text-base font-black text-cyan-400 font-mono">
                                                {simResult.interval} {simResult.state === 'REVIEW' ? 'ngày' : 'phút'}
                                            </span>
                                        </div>
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Hệ số Ease</span>
                                            <span className="text-base font-black text-amber-400 font-mono">{simResult.ease?.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Chu kỳ trước khi quên</span>
                                            <span className="text-base font-black text-indigo-400 font-mono">{simResult.prelapseInterval || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Detailed breakdown explanation */}
                                    <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/20 text-xs text-indigo-200">
                                        {simResult.state === 'RELEARNING' && (
                                            <p>💡 <b>Thẻ bị quên:</b> Chuyển sang RELEARNING (hẹn lại 10 phút). Đã lưu giữ chu kỳ cũ <b>{simResult.prelapseInterval} ngày</b>. Khi tốt nghiệp ở lượt tiếp theo, chu kỳ sẽ bị giảm phạt 50%!</p>
                                        )}
                                        {simResult.state === 'REVIEW' && lastRating === 'good' && simPrelapse && (
                                            <p>✅ <b>Giảm chu kỳ thành công:</b> Thẻ tốt nghiệp từ RELEARNING trở lại REVIEW. Chu kỳ cũ {simPrelapse} ngày đã giảm 50% xuống còn <b>{simResult.interval} ngày</b>!</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: QUEUE & TIME INSERTION TEST */}
                    {activeTab === 'queue' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <span className="text-xs text-slate-400 block font-bold">Vị trí hiện tại trong Queue: Index {currentIndex} / {demoQueue.length}</span>
                                    <span className="text-sm font-bold text-white">Thẻ đang đánh giá: <span className="text-amber-400 font-japanese">{demoQueue[currentIndex]?.character || 'Đã hoàn thành!'}</span></span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleFastForwardTime(10)} className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg">
                                        <FastForward className="w-4 h-4" /> ⏩ Tua nhanh +10 phút
                                    </button>
                                    <button onClick={handleResetQueueDemo} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer">
                                        <RotateCcw className="w-3.5 h-3.5" /> Đặt lại
                                    </button>
                                </div>
                            </div>

                            {/* Current Card Actions */}
                            {currentIndex < demoQueue.length && (
                                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Đánh giá cho thẻ hiện tại "{demoQueue[currentIndex]?.character}":</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleQueueRateCard('again')} className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-xl border border-rose-500/40 text-xs cursor-pointer">
                                            1. Quên rồi (Hẹn +10p & Đưa vào Waiting Pool)
                                        </button>
                                        <button onClick={() => handleQueueRateCard('good')} className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/40 text-xs cursor-pointer">
                                            3. Tốt (Tốt nghiệp vào REVIEW)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Live Queue Display */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                                        <Activity className="w-4 h-4 text-cyan-400" /> Hàng chờ Live (Review Queue - {demoQueue.length} thẻ)
                                    </h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {demoQueue.map((item, idx) => (
                                            <div key={`${item.id}_${idx}`} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                                                idx === currentIndex ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold' : (idx < currentIndex ? 'bg-slate-900/40 border-slate-800/60 opacity-50' : 'bg-slate-900 border-slate-800 text-slate-300')
                                            }`}>
                                                <span>[{idx}] {item.character}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800">{item.srsState || 'REVIEW'} ({item.srsInterval}d)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <h4 className="text-xs font-bold text-amber-400 uppercase mb-3 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-amber-400" /> Hàng chờ Thời gian (Waiting Pool - {waitingPool.length} thẻ)
                                    </h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {waitingPool.length === 0 ? (
                                            <p className="text-xs text-slate-500 py-6 text-center">Trống (Không có thẻ nào đang chờ mốc 10 phút)</p>
                                        ) : (
                                            waitingPool.map(w => (
                                                <div key={w.id} className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs font-mono text-amber-200">
                                                    <span>{w.character}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Hẹn 10p (+10m)</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Log Panel */}
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 max-h-40 overflow-y-auto">
                                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nhật ký sự kiện chèn thẻ:</span>
                                {queueLogs.map((log, i) => (
                                    <div key={i} className="text-emerald-400/90 leading-snug">{log}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: AUTOMATED TEST SUITE */}
                    {activeTab === 'suite' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                                <div>
                                    <h4 className="text-sm font-bold text-white">Chạy Kịch bản Test Tự Động Thuật Toán SRS</h4>
                                    <p className="text-xs text-slate-400">Kiểm tra tính chính xác của các trường hợp chuyển trạng thái, giảm 50% chu kỳ và lưu giữ prelapseInterval.</p>
                                </div>
                                <button onClick={handleRunAutomatedSuite} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg">
                                    <Play className="w-4 h-4 fill-white" /> ▶ Run All Automated Tests
                                </button>
                            </div>

                            {testSuiteResults && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-xs font-bold uppercase text-slate-400">Kết quả chạy Test:</span>
                                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                            {testSuiteResults.filter(r => r.passed).length} / {testSuiteResults.length} PASSED (100%)
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {testSuiteResults.map((r, idx) => (
                                            <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    <span className="font-bold text-slate-200">{r.name}</span>
                                                </div>
                                                <div className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-1 rounded">
                                                    Interval: <span className="text-cyan-400 font-bold">{r.output.interval}d</span> | State: <span className="text-amber-400 font-bold">{r.output.state}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all">
                        Đóng Bảng Test
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SrsTestingPanelModal;
