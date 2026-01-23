const removeAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    };
        const { useState, useEffect, useMemo, useRef } = React;
    
    const calculateSRS = (currentData, quality) => {
      let { level = 0, easeFactor = 2.5, nextReview } = currentData || {};
      const now = Date.now();
      if (nextReview && nextReview > now) {
          if (quality === 1) return currentData;
      }
    
      if (quality === 0) {
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        
        return {
          level: 0,           // Reset khoảng cách về 0
          easeFactor: easeFactor, // Lưu hệ số mới (đã bị trừ)
          nextReview: 0,      // 0 nghĩa là "Chưa xong", lát nữa hỏi lại ngay
          isDone: false
        };
    
      } else {
        // === BẤM NÚT "ĐÃ BIẾT" (XANH) ===
    
        let newInterval;
    
        // Tình huống A: Chữ này đang bị phạt (nextReview = 0) hoặc mới tinh (level = 0)
        // -> Đặt lịch cứng là 1 ngày, KHÔNG nhân hệ số.
        if (!nextReview || nextReview === 0 || level === 0) {
            newInterval = 1; 
        } 
        // Tình huống B: Chữ này đang ôn tập định kỳ (Đã thuộc từ các hôm trước)
        else {
            // CÔNG THỨC ANKI: Ngày mới = Ngày cũ * Hệ số IQ
            newInterval = Math.ceil(level * easeFactor);
            
            // THƯỞNG: Tăng IQ lên một chút (tối đa 2.5)
            easeFactor = Math.min(2.5, easeFactor + 0.1); 
        }
    
        // --- XỬ LÝ 5 GIỜ SÁNG ---
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + newInterval);
        nextDate.setHours(5, 0, 0, 0);
    
        return {
          level: newInterval, // Lưu khoảng cách ngày mới làm level
          easeFactor: easeFactor,
          nextReview: nextDate.getTime(),
          isDone: false // Không bao giờ "Done" hẳn, chỉ đẩy ngày ra xa vô tận
        };
      }
    };
    
     // --- FETCH DATA FROM GITHUB --- 
    const fetchDataFromGithub = async () => {
      try { 
        // Tải song song cả 2 file database
        const [dbResponse, onkunResponse] = await Promise.all([
          fetch('./data/kanji_db.json'),
          fetch('./data/onkun.json')
        ]);
    
        let kanjiDb = null;
        let onkunDb = null;
    
        if (dbResponse.ok) kanjiDb = await dbResponse.json();
        else console.warn("Không tải được kanji_db.json");
    
        if (onkunResponse.ok) onkunDb = await onkunResponse.json();
        else console.warn("Không tải được onkun.json (sẽ dùng API online)");
    
        // Trả về object chứa cả 2
        return { ...kanjiDb, ONKUN_DB: onkunDb }; 
      } catch (error) {
        console.error("Lỗi tải dữ liệu hệ thống:", error);
        return null;
      }
    };
    
        // --- UTILS & DATA FETCHING ---
    
        const getHex = (char) => char.codePointAt(0).toString(16).toLowerCase().padStart(5, '0');
    
        
    
        
       const fetchKanjiData = async (char) => {
        const hex = getHex(char);
        
        // ƯU TIÊN LINK LOCAL/GITHUB TRƯỚC
        const sources = [
          `./data/svg/${hex}.svg`,  // <--- Thêm dòng này lên đầu
          `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`,
          `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}-Kaisho.svg`,
          `https://cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsKana/${hex}.svg`,
          `https://cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJa/${hex}.svg`
        ];
    
        for (const url of sources) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const text = await res.text();
              // Kiểm tra sơ bộ xem có phải SVG hợp lệ không
              if (text.includes('<svg')) {
                 return { success: true, svg: text, source: url };
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        return { success: false };
      };
    
        
        const useKanjiSvg = (char) => {
        const [state, setState] = useState({ 
            loading: true, 
            paths: [], 
            fullSvg: null, 
            failed: false 
        });
        const mounted = useRef(true);
    
        useEffect(() => {
            mounted.current = true;
            if (!char) return;
    
            setState({ loading: true, paths: [], fullSvg: null, failed: false });
    
            fetchKanjiData(char).then((result) => {
            if (!mounted.current) return;
    
            if (result.success) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(result.svg, "image/svg+xml");
                
                
                const pathElements = Array.from(doc.querySelectorAll('path'));
                const pathData = pathElements.map(p => p.getAttribute('d')).filter(d => d);
                
            
                const svgString = new XMLSerializer().serializeToString(doc.documentElement);
    
                setState({
                loading: false,
                paths: pathData,
                fullSvg: svgString,
                failed: false
                });
            } else {
                setState({
                loading: false,
                paths: [],
                fullSvg: null,
                failed: true
                });
            }
            });
    
            return () => { mounted.current = false; };
        }, [char]);
    
        return state;
        };
    
    const useKanjiReadings = (char, active, dbData) => {
      const [readings, setReadings] = useState({ on: '', kun: '' });
    
      useEffect(() => {
        if (!char || !active) return;
    
        // CÁCH 1: Lấy từ dữ liệu nội bộ (data/onkun.json)
        if (dbData?.ONKUN_DB && dbData.ONKUN_DB[char]) {
          const info = dbData.ONKUN_DB[char];
          setReadings({
            // Dữ liệu của bạn là mảng, cần join lại thành chuỗi
            on: info.readings_on?.join(', ') || '---', 
            kun: info.readings_kun?.join(', ') || '---'
          });
          return; // Đã có dữ liệu thì dừng, không gọi API nữa
        }
    
        // CÁCH 2: Fallback sang API Online (như cũ)
        fetch(`https://kanjiapi.dev/v1/kanji/${char}`)
          .then(res => res.json())
          .then(data => {
            if (data) {
              setReadings({
                on: data.on_readings?.join(', ') || '---',
                kun: data.kun_readings?.join(', ') || '---'
              });
            }
          })
          .catch(() => setReadings({ on: '---', kun: '---' }));
          
      }, [char, active, dbData]); // Thêm dbData vào dependency
    
      return readings;
    };
    // --- BƯỚC 2: COMPONENT BẢNG DANH SÁCH ÔN TẬP (CẬP NHẬT NỘI DUNG HƯỚNG DẪN MỚI) ---
    const ReviewListModal = ({ isOpen, onClose, srsData, onResetSRS }) => {
        const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
        const [isHelpOpen, setIsHelpOpen] = React.useState(false);
    
        // Logic khóa cuộn nền
        React.useEffect(() => {
            if (isOpen) document.body.style.overflow = 'hidden';
            else document.body.style.overflow = 'unset';
            return () => { document.body.style.overflow = 'unset'; };
        }, [isOpen]);
    
        // Reset trạng thái khi đóng
        React.useEffect(() => {
            if (!isOpen) {
                setIsConfirmOpen(false);
                setIsHelpOpen(false);
            }
        }, [isOpen]);
    
        // Logic gom nhóm dữ liệu
        const groupedData = React.useMemo(() => {
            const groups = { today: [] }; 
            const now = Date.now();
            Object.entries(srsData || {}).forEach(([char, data]) => {
                if ((!data.nextReview && data.nextReview !== 0) || (data.isDone === true)) return;
                if (data.nextReview === 0 || data.nextReview <= now) {
                    groups.today.push(char);
                } else {
                    const dateObj = new Date(data.nextReview);
                    const dateKey = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(char);
                }
            });
            return groups;
        }, [srsData, isOpen]);
    
        if (!isOpen) return null;
    
        const futureDates = Object.keys(groupedData).filter(k => k !== 'today').sort((a, b) => {
            const [d1, m1] = a.split('/').map(Number);
            const [d2, m2] = b.split('/').map(Number);
            return m1 === m2 ? d1 - d2 : m1 - m2;
        });
    
        return (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer" onClick={onClose}>
                <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 overflow-hidden relative transition-all cursor-default ${isConfirmOpen ? 'max-w-[300px]' : 'max-w-md'}`} onClick={e => e.stopPropagation()}>
                    
                    {isHelpOpen ? (
                        // === GIAO DIỆN HƯỚNG DẪN (SRS GUIDE) - NỘI DUNG MỚI ===
                        // ĐÃ SỬA: Thay div bao ngoài bằng Fragment <> để flex-1 hoạt động đúng với parent
                        <>
                             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                                <h3 className="text-base font-black text-indigo-700 uppercase flex items-center gap-2">
                                    🎓 HƯỚNG DẪN
                                </h3>
                                <button onClick={() => setIsHelpOpen(false)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-gray-600 space-y-6 flex-1">
                                
                                {/* 1. Phương pháp học */}
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                                        <span className="text-lg">🧠</span> 1. PHƯƠNG PHÁP HỌC
                                    </h4>
                                    <p className="text-sm leading-relaxed text-justify">
                                        Hệ thống sử dụng thuật toán <b>Lặp lại ngắt quãng</b> (Spaced Repetition) tích hợp vào <b>FLASHCARD</b>. Thay vì học nhồi nhét, hệ thống sẽ tính toán <b>"thời điểm lãng quên"</b> của não bộ để nhắc bạn ôn lại <b>đúng lúc bạn sắp quên</b>.
                                    </p>
                                </div>
    
                                {/* 2. Cơ chế hoạt động */}
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                                        <span className="text-lg">⚙️</span> 2. CƠ CHẾ HOẠT ĐỘNG
                                    </h4>
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-sm text-indigo-900 leading-relaxed">
                                        <p className="mb-2">
                                            Hệ thống tự động tính toán <b>mức độ ghi nhớ</b> của bạn đối với từng Kanji (dựa trên quá trình và kết quả học Flashcard). Từ đó đưa ra <b>lịch trình ôn tập phù hợp</b> riêng cho từng chữ.
                                        </p>
                                        <p className="flex gap-1 items-start mt-2 font-medium">
                                            <span>🔔</span>
                                            <span><b>Nhắc nhở:</b> Thông báo sẽ tự động xuất hiện trên giao diện web khi đến hạn ôn tập.</span>
                                        </p>
                                    </div>
                                </div>
                                
                                {/* 3. Lưu ý dữ liệu */}
                                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-sm">
                                    <h4 className="font-bold text-yellow-700 mb-1 flex items-center gap-1">
                                        ⚠️ 3. LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1.5 text-gray-600">
                                        <li><b>Lưu trữ:</b> Dữ liệu học tập được lưu trực tiếp trên <b>Trình duyệt</b> của thiết bị bạn đang dùng.</li>
                                        <li><b>Dung lượng:</b> Cực kỳ nhẹ! Toàn bộ 2136 Kanji chỉ chiếm khoảng 300KB (nhẹ hơn 1 bức ảnh mờ), hoàn toàn không gây nặng máy.</li>
                                        <li><b>Cảnh báo:</b> Dữ liệu sẽ mất nếu bạn <b>Xóa Cookie/Dữ liệu duyệt web</b> hoặc dùng <b>Tab ẩn danh</b>. Hãy dùng trình duyệt thường để học nhé!</li>
                                    </ul>
                                </div>
    
                                <button onClick={() => setIsHelpOpen(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs uppercase">
                                    quay lại danh sách ôn tập
                                </button>
                            </div>
                        </>
    
                    ) : !isConfirmOpen ? (
                        // === GIAO DIỆN 1: DANH SÁCH (Mặc định) ===
                        <>
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div className="flex items-baseline gap-3">
                                    <h3 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">📅 LỊCH TRÌNH ÔN TẬP</h3>
                                    <button onClick={() => setIsHelpOpen(true)} className="text-[12px] font-bold text-blue-500 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-700 underline-offset-2 transition-all">
                                        xem hướng dẫn
                                    </button>
                                </div>
                                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
    
                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-4">
                                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-orange-600 uppercase">Cần ôn ngay</span>
                                            <span className="bg-orange-200 text-orange-700 text-sm font-bold px-1.5 rounded">{groupedData.today.length} chữ</span>
                                        </div>
                                        {groupedData.today.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {groupedData.today.map((char, i) => (
                                                    <span key={i} className="inline-block bg-white text-gray-800 border border-orange-200 rounded px-1.5 py-0.5 text-lg font-['Klee_One'] min-w-[32px] text-center shadow-sm">{char}</span>
                                                ))}
                                            </div>
                                        ) : (<p className="text-[12px] text-gray-400 italic">Không có Kanji tồn đọng. Giỏi lắm! 🎉</p>)}
                                    </div>
    
                                    {futureDates.length > 0 && (
                                        <div className="space-y-3">
                                             <div className="flex items-center gap-2 mt-2">
                                                <span className="h-[1px] flex-1 bg-gray-100"></span>
                                                <span className="text-sm font-bold text-gray-400 uppercase">Sắp tới</span>
                                                <span className="h-[1px] flex-1 bg-gray-100"></span>
                                            </div>
                                            {futureDates.map(date => (
                                                <div key={date} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                            Ngày {date}
                                                        </span>
                                                        <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 rounded">{groupedData[date].length} chữ</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {groupedData[date].map((char, i) => (
                                                            <span key={i} className="inline-block bg-white text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 text-base font-['Klee_One'] min-w-[28px] text-center opacity-70">{char}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
    
                                <div className="mt-8 pt-6 border-t border-dashed border-gray-200 text-center pb-2">
                                    <button 
                                        onClick={() => {
                                            if (!srsData || Object.keys(srsData).length === 0) {
                                                alert("Danh sách trống");
                                                return;
                                            }
                                            setIsConfirmOpen(true);
                                        }}
                                        className="text-red-700 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        XÓA TOÀN BỘ TIẾN ĐỘ
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        // === GIAO DIỆN 2: CẢNH BÁO XÓA ===
                        <div 
                            className="p-7 text-center animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center justify-center min-h-[300px] cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation(); 
                                setIsConfirmOpen(false); 
                            }}
                        >
                            <div 
                                className="w-full h-full flex flex-col items-center justify-center cursor-default" 
                                onClick={(e) => e.stopPropagation()} 
                            >
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-5 animate-bounce">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                </div>
                                <h3 className="text-xl font-black text-gray-800 mb-2 uppercase">Cảnh báo</h3>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-[260px]">
                                    Lịch sử học tập sẽ bị xóa vĩnh viễn.<br/>
                                    <span className="text-red-500 font-bold">Không thể khôi phục lại!</span>
                                </p>
                                
                                <div className="flex flex-col gap-3 w-full max-w-[260px]">
                                    <button onClick={() => setIsConfirmOpen(false)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 uppercase text-xs tracking-wider">KHÔNG XÓA NỮA</button>
                                    <button onClick={() => { onResetSRS(); setIsConfirmOpen(false); onClose(); }} className="w-full py-3 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold rounded-xl transition-all text-xs">Vẫn xóa dữ liệu</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // --- BƯỚC 4: FLASHCARD MODAL (ĐÃ GẮN SỰ KIỆN LƯU DỮ LIỆU) ---
    const FlashcardModal = ({ isOpen, onClose, text, dbData, onSrsUpdate, srsData, onSrsRestore }) => { 
        const [originalQueue, setOriginalQueue] = React.useState([]);
        const [queue, setQueue] = React.useState([]);
        const [currentIndex, setCurrentIndex] = React.useState(0);
        const [isFlipped, setIsFlipped] = React.useState(false);
        const [unknownIndices, setUnknownIndices] = React.useState([]);
        const [knownCount, setKnownCount] = React.useState(0);
        const [history, setHistory] = React.useState([]); 
        const [isFinished, setIsFinished] = React.useState(false);
        const [exitDirection, setExitDirection] = React.useState(null);
        const [showHint, setShowHint] = React.useState(true);
        const [dragX, setDragX] = React.useState(0); 
        const [startX, setStartX] = React.useState(0); 
        const [isDragging, setIsDragging] = React.useState(false);
        const [btnFeedback, setBtnFeedback] = React.useState(null);
        const [isShuffleOn, setIsShuffleOn] = React.useState(false);
    
        // --- (Giữ nguyên các hàm bổ trợ: triggerConfetti, shuffleArray, startNewSession...) ---
        // Bạn có thể copy lại các hàm này từ code cũ nếu muốn ngắn gọn, hoặc dùng đoạn dưới đây:
        const triggerConfetti = React.useCallback(() => { if (typeof confetti === 'undefined') return; const count = 200; const defaults = { origin: { y: 0.6 }, zIndex: 1500 }; function fire(particleRatio, opts) { confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) }); } fire(0.25, { spread: 26, startVelocity: 55 }); fire(0.2, { spread: 60 }); fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 }); fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 }); fire(0.1, { spread: 120, startVelocity: 45 }); }, []);
        React.useEffect(() => { if (isFinished && isOpen) { triggerConfetti(); } }, [isFinished, triggerConfetti]);
        const shuffleArray = React.useCallback((array) => { const newArr = [...array]; for (let i = newArr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [newArr[i], newArr[j]] = [newArr[j], newArr[i]]; } return newArr; }, []);
        const startNewSession = React.useCallback((chars) => { setQueue(chars); setCurrentIndex(0); setIsFlipped(false); setUnknownIndices([]); setKnownCount(0); setHistory([]); setIsFinished(false); setExitDirection(null); setDragX(0); setBtnFeedback(null); }, []);
        
        // --- Các useEffect cơ bản ---
        React.useEffect(() => { if (isOpen && text) { const chars = Array.from(text).filter(c => c.trim()); setOriginalQueue(chars); const queueToLoad = isShuffleOn ? shuffleArray(chars) : chars; startNewSession(queueToLoad); setShowHint(true); } }, [isOpen, text, startNewSession]); 
        React.useEffect(() => { if (isOpen) { const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth; document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; document.body.style.paddingRight = `${scrollBarWidth}px`; document.body.style.touchAction = 'none'; } else { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; document.body.style.paddingRight = ''; document.body.style.touchAction = ''; } return () => { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; document.body.style.paddingRight = ''; document.body.style.touchAction = ''; }; }, [isOpen]);
        
        // --- Các hàm xử lý UI ---
        const toggleFlip = React.useCallback(() => { setIsFlipped(prev => !prev); if (currentIndex === 0) setShowHint(false); }, [currentIndex]);
        const handleNext = React.useCallback((isKnown) => { 
            if (exitDirection || isFinished || queue.length === 0) return; 
            
            // 1. Lấy chữ hiện tại
            const currentChar = queue[currentIndex];
    
            // 2. CHỤP LẠI DỮ LIỆU CŨ (SNAPSHOT) TRƯỚC KHI BỊ THAY ĐỔI
            // Nếu chưa có dữ liệu thì lưu object rỗng
            const snapshot = (srsData && srsData[currentChar]) ? { ...srsData[currentChar] } : {};
    
            setIsFlipped(false); 
    
            // Logic đếm số lượng (Giữ nguyên)
            if (isKnown) { 
                setKnownCount(prev => prev + 1); 
            } else { 
                setUnknownIndices(prev => [...prev, currentIndex]); 
            } 
    
            // 3. LƯU VÀO HISTORY (Lưu cả trạng thái đúng/sai VÀ bản chụp dữ liệu cũ)
            setHistory(prev => [...prev, { isKnown, char: currentChar, snapshot }]); 
    
            // Gọi hàm cập nhật dữ liệu mới (Giữ nguyên)
            setBtnFeedback(isKnown ? 'right' : 'left'); 
            setExitDirection(isKnown ? 'right' : 'left'); 
            
            setTimeout(() => { 
                setCurrentIndex((prevIndex) => { 
                    if (prevIndex < queue.length - 1) { 
                        setExitDirection(null); 
                        setDragX(0); 
                        setBtnFeedback(null); 
                        return prevIndex + 1; 
                    } else { 
                        setIsFinished(true); 
                        return prevIndex; 
                    } 
                }); 
            }, 150); 
        }, [currentIndex, queue, exitDirection, isFinished, srsData]);
        const handleBack = (e) => { 
            if (e) { e.preventDefault(); e.stopPropagation(); e.currentTarget.blur(); } 
            
            if (currentIndex > 0 && history.length > 0) { 
                // 1. Lấy phần tử lịch sử cuối cùng (Bây giờ nó là object chứa snapshot)
                const lastItem = history[history.length - 1]; 
                
                // 2. Tính toán lại UI (Dựa vào lastItem.isKnown thay vì lastIsKnown)
                if (lastItem.isKnown === true) { 
                    setKnownCount(prev => Math.max(0, prev - 1)); 
                } else { 
                    setUnknownIndices(prev => prev.slice(0, -1)); 
                } 
    
                // 3. KHÔI PHỤC DỮ LIỆU SRS VỀ TRẠNG THÁI CŨ
                // Nếu lúc nãy có lưu snapshot, giờ ta đè nó lại vào hệ thống
                if (onSrsRestore && lastItem.char) {
                    onSrsRestore(lastItem.char, lastItem.snapshot);
                }
    
                // 4. Cập nhật lại các state UI khác (Giữ nguyên)
                setHistory(prev => prev.slice(0, -1)); 
                setCurrentIndex(prev => prev - 1); 
                setIsFlipped(false); 
                setExitDirection(null); 
                setDragX(0); 
                setBtnFeedback(null); 
            } 
        };
        const handleToggleShuffle = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); e.currentTarget.blur(); } const nextState = !isShuffleOn; setIsShuffleOn(nextState); setBtnFeedback('shuffle'); setTimeout(() => setBtnFeedback(null), 400); const passedPart = queue.slice(0, currentIndex); const remainingPart = queue.slice(currentIndex); if (remainingPart.length === 0) return; let newRemainingPart; if (nextState) { newRemainingPart = shuffleArray(remainingPart); } else { const counts = {}; remainingPart.forEach(c => { counts[c] = (counts[c] || 0) + 1; }); newRemainingPart = []; for (const char of originalQueue) { if (counts[char] > 0) { newRemainingPart.push(char); counts[char]--; } } } setQueue([...passedPart, ...newRemainingPart]); setIsFlipped(false); };
        
        // --- Các hàm Drag ---
        const handleDragStart = (e) => { if (exitDirection || isFinished) return; setIsDragging(true); const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX; setStartX(clientX); };
        const handleDragMove = (e) => { if (!isDragging || exitDirection) return; const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX; setDragX(clientX - startX); };
        const dynamicBorder = () => { if (dragX > 70 || btnFeedback === 'right') return '#22c55e'; if (dragX < -70 || btnFeedback === 'left') return '#ef4444'; return 'white'; };
    
        // --- SỬA LOGIC: PHÍM TẮT ---
        React.useEffect(() => {
            const handleKeyDown = (e) => {
                if (!isOpen || isFinished) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                switch (e.key) {
                    case ' ': case 'ArrowUp': case 'ArrowDown':
                        e.preventDefault(); toggleFlip(); break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        // [LOGIC MỚI] Gọi hàm lưu dữ liệu: 0 = Đang học
                        if(onSrsUpdate) onSrsUpdate(queue[currentIndex], 0);
                        handleNext(false); 
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        // [LOGIC MỚI] Gọi hàm lưu dữ liệu: 1 = Đã biết
                        if(onSrsUpdate) onSrsUpdate(queue[currentIndex], 1);
                        handleNext(true); 
                        break;
                    case 'Escape': onClose(); break;
                    default: break;
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isOpen, isFinished, toggleFlip, handleNext, onClose, onSrsUpdate, queue, currentIndex]);
    
        // --- SỬA LOGIC: VUỐT (DRAG) ---
        const handleDragEnd = () => {
            if (!isDragging) return;
            setIsDragging(false);
            if (dragX > 70) {
                 // [LOGIC MỚI] Kéo phải = Đã biết (1)
                 if(onSrsUpdate) onSrsUpdate(queue[currentIndex], 1);
                 handleNext(true);
            }
            else if (dragX < -70) {
                 // [LOGIC MỚI] Kéo trái = Đang học (0)
                 if(onSrsUpdate) onSrsUpdate(queue[currentIndex], 0);
                 handleNext(false);
            }
            else setDragX(0);
        };
    
        if (!isOpen || queue.length === 0) return null;
        const currentChar = queue[currentIndex] || ''; 
        if (!currentChar && !isFinished && isOpen) { setIsFinished(true); }
        const info = dbData?.KANJI_DB?.[currentChar] || dbData?.ALPHABETS?.hiragana?.[currentChar] || dbData?.ALPHABETS?.katakana?.[currentChar] || {};
        const progressRatio = currentIndex / (queue.length - 1 || 1);
    
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/95 backdrop-blur-xl animate-in fade-in duration-200 select-none touch-none" style={{ touchAction: 'none' }} onClick={(e) => e.stopPropagation()}>
                <div className="w-full max-w-sm flex flex-col items-center">
                    {!isFinished ? (
                        <>
                            {/* --- PHẦN CARD (GIỮ NGUYÊN) --- */}
                            <div className={`relative transition-all duration-300 ease-in-out ${exitDirection === 'left' ? '-translate-x-16 -rotate-3' : exitDirection === 'right' ? 'translate-x-16 rotate-3' : ''}`} style={{ transform: !exitDirection && dragX !== 0 ? `translateX(${dragX}px) rotate(${dragX * 0.02}deg)` : '', transition: isDragging ? 'none' : 'all 0.25s ease-out' }}>
                                <div onClick={() => { if (Math.abs(dragX) < 5) toggleFlip(); }} onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd} className={`relative w-64 h-80 cursor-pointer transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                                    <div className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border-4 [backface-visibility:hidden] overflow-hidden" style={{ borderColor: dynamicBorder() }}>
                                        <span className="text-8xl font-['Klee_One'] text-gray-800 transform -translate-y-5">{currentChar}</span>
                                        {currentIndex === 0 && showHint && (<p className="absolute bottom-14 text-indigo-400 text-[7px] font-black uppercase tracking-[0.4em] animate-pulse">Chạm để lật</p>)}
                                        <div className={`absolute bottom-5 left-0 right-0 px-6 items-center z-50 ${isFlipped ? 'hidden sm:flex' : 'flex'} justify-between`}>
                                            <button onClick={handleBack} className={`p-2.5 bg-black/5 hover:bg-black/10 active:scale-90 rounded-full transition-all flex items-center justify-center ${currentIndex === 0 ? 'opacity-10 cursor-not-allowed' : 'text-gray-400 hover:text-gray-700'}`} disabled={currentIndex === 0}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="pointer-events-none"><path d="M9 14 4 9l5-5"/><path d="M4 9h12a5 5 0 0 1 0 10H7"/></svg>
                                            </button>
                                            <button onClick={handleToggleShuffle} className={`p-2.5 bg-black/5 hover:bg-black/10 active:scale-90 rounded-full transition-all flex items-center justify-center ${isShuffleOn ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`pointer-events-none ${btnFeedback === 'shuffle' ? 'animate-[spin_0.4s_linear_infinite]' : ''}`}><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-indigo-600 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-6 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] border-4 overflow-hidden text-center" style={{ borderColor: dynamicBorder() }}>
                                        <div className="flex-1 flex flex-col items-center justify-center w-full transform -translate-y-3">
                                            <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter leading-tight">{info.sound || '---'}</h3>
                                            <p className="text-base opacity-90 font-medium italic leading-snug px-2">{info.meaning || ''}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* --- THANH TIẾN TRÌNH (GIỮ NGUYÊN) --- */}
                            <div className="w-64 mt-8 mb-6 relative h-6 flex items-center">
                                <div className="w-full h-1 bg-white/10 rounded-full relative overflow-hidden"><div className="absolute top-0 left-0 h-full bg-sky-400 transition-all duration-300 ease-out" style={{ width: `${progressRatio * 100}%` }} /></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full h-1 pointer-events-none"><div className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-9 rounded-md flex items-center justify-center bg-white shadow-sm z-0"><span className="text-[10px] font-black text-black leading-none">{queue.length}</span></div></div>
                                <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 pointer-events-none"><div className="absolute top-1/2 -translate-y-1/2 h-7 w-9 bg-sky-400 rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.8)] transition-all duration-300 ease-out z-10" style={{ left: `calc(${progressRatio * 100}% - ${progressRatio * 36}px)` }}><span className="text-[10px] font-black text-white leading-none">{currentIndex + 1}</span></div></div>
                            </div>
    
                            {/* --- SỬA: NÚT ĐIỀU HƯỚNG (GẮN SỰ KIỆN LƯU) --- */}
                            <div className="flex gap-3 w-full px-8">
                                <button 
                                    onClick={() => {
                                        // [LOGIC MỚI] Nút Đỏ = 0
                                        if(onSrsUpdate) onSrsUpdate(currentChar, 0); 
                                        handleNext(false);
                                    }} 
                                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 hover:text-red-600 active:bg-red-500 text-red-500 active:text-white border border-red-500/20 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 uppercase"
                                >
                                    ĐANG HỌC <span className="bg-red-600 text-white min-w-[28px] h-6 px-2 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm">{unknownIndices.length}</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        // [LOGIC MỚI] Nút Xanh = 1
                                        if(onSrsUpdate) onSrsUpdate(currentChar, 1); 
                                        handleNext(true);
                                    }} 
                                    className="flex-1 py-3 bg-green-500/10 hover:bg-green-500/20 hover:text-green-600 active:bg-green-500 text-green-500 active:text-white border border-green-500/20 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 uppercase"
                                >
                                    ĐÃ BIẾT <span className="bg-green-600 text-white min-w-[28px] h-6 px-2 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm">{knownCount}</span>
                                </button>
                            </div>
    
                            <button onClick={onClose} className="mt-8 text-white/40 hover:text-red-500 transition-all text-[13px] sm:text-[11px] font-black uppercase tracking-[0.2em] py-2 px-4 active:scale-95">Đóng thẻ</button>
                        </>
                    ) : (
                        <div className="bg-white rounded-[2rem] p-8 w-full max-w-[280px] text-center shadow-2xl border-4 border-indigo-50 animate-in zoom-in-95">
                            <div className="text-5xl mb-4 animate-bounce cursor-pointer hover:scale-125 transition-transform" onClick={triggerConfetti} title="Bấm để bắn pháo hoa!">🎉</div>
                            <h3 className="text-lg font-black text-gray-800 mb-1 uppercase">Hoàn thành</h3>
                            <p className="text-gray-400 mb-6 text-[11px] font-medium italic">Bạn đã học được {knownCount}/{queue.length} chữ.</p>
                            <div className="space-y-2">
                                {unknownIndices.length > 0 && (<button onClick={() => startNewSession(isShuffleOn ? shuffleArray(unknownIndices.map(idx => queue[idx])) : unknownIndices.map(idx => queue[idx]))} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] shadow-lg active:scale-95 transition-colors">ÔN LẠI {unknownIndices.length} THẺ ĐANG HỌC</button>)}
                                <button onClick={() => startNewSession(isShuffleOn ? shuffleArray(originalQueue) : originalQueue)} className="w-full py-3.5 bg-blue-50 border-2 border-blue-100 text-blue-500 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700 rounded-xl font-black text-[11px] transition-all active:scale-95">HỌC LẠI TỪ ĐẦU</button>
                                <button onClick={onClose} className="w-full py-3.5 bg-white border-2 border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-600 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all active:scale-95">THOÁT</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    // --- COMPONENT POPUP HOẠT HỌA (Đã chỉnh con trỏ chuột) ---
    const KanjiAnimationModal = ({ char, paths, fullSvg, dbData, isOpen, onClose }) => {
    const [key, setKey] = useState(0); 
    const [strokeNumbers, setStrokeNumbers] = useState([]); 
    const [speedConfig, setSpeedConfig] = useState({ duration: 3, delay: 0.6 });
    const initialDelay = 0.4;
    const [activeSpeed, setActiveSpeed] = useState('normal'); 
    
    // Logic khóa cuộn
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);
    
    // Logic lấy số thứ tự
    useEffect(() => {
        if (fullSvg) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(fullSvg, "image/svg+xml");
            const textElements = Array.from(doc.querySelectorAll('text'));
            const numbers = textElements.map(t => ({
                value: t.textContent,
                transform: t.getAttribute('transform')
            }));
            setStrokeNumbers(numbers);
        }
    }, [fullSvg]);
    
    const handleReplay = (mode) => {
        let newConfig = { duration: 3, delay: 0.6 };
        if (mode === 'slow') newConfig = { duration: 4, delay: 1 };      
        if (mode === 'fast') newConfig = { duration: 1.5, delay: 0.25 };  
        setSpeedConfig(newConfig);
        setActiveSpeed(mode);
        setKey(prev => prev + 1); 
    };
    
    if (!isOpen) return null;
    
    // Logic lấy dữ liệu thông minh
    let info = {};
    if (dbData?.KANJI_DB?.[char]) info = dbData.KANJI_DB[char];
    else if (dbData?.ALPHABETS?.hiragana?.[char]) info = dbData.ALPHABETS.hiragana[char];
    else if (dbData?.ALPHABETS?.katakana?.[char]) info = dbData.ALPHABETS.katakana[char];
    
    return (
        <div 
            // THÊM: cursor-pointer (để hiện bàn tay khi ở vùng tối)
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
            onClick={onClose} 
        >
            <div 
                // THÊM: cursor-default (để chuột trở lại bình thường khi vào trong khung)
                className="bg-white rounded-2xl shadow-2xl p-5 w-[90%] max-w-sm flex flex-col items-center relative animate-in zoom-in-95 duration-200 cursor-default"
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
    
                <div className="flex items-center justify-center gap-5 mb-3 mt-2 w-full px-2">
                    <h3 className="text-5xl font-black text-indigo-600 font-['Klee_One'] leading-none">
                        {char}
                    </h3>
                    <div className="flex flex-col items-start justify-center h-full pt-1">
                        {info.sound ? (
                            <>
                                <span className="text-xl font-black text-gray-800 uppercase font-sans tracking-wide leading-tight mb-0.5">
                                    {info.sound}
                                </span>
                                {info.meaning && (
                                    <span className="text-xs text-gray-500 font-medium font-sans italic leading-tight text-left">
                                        {info.meaning}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-gray-400 font-sans">---</span>
                        )}
                    </div>
                </div>
    
                <div key={key} className="w-60 h-40 bg-white border border-indigo-50 rounded-xl relative mb-4 shadow-inner flex-shrink-0 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="50" y1="0" x2="50" y2="100" stroke="black" strokeWidth="0.5" strokeDasharray="4 4" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="black" strokeWidth="0.5" strokeDasharray="4 4" />
                    </svg>
    
                    <svg viewBox="0 0 109 109" className="h-full w-auto p-2">
                        {strokeNumbers.map((num, idx) => (
                            <text 
                                key={`num-${idx}`} 
                                transform={num.transform} 
                                className="stroke-number"
                                style={{ animationDelay: `${initialDelay + (idx * speedConfig.delay)}s` }} 
                            >
                                {num.value}
                            </text>
                        ))}
                        {paths.map((d, index) => (
                            <path 
                                key={`path-${index}`}
                                d={d} 
                                className="stroke-anim-path"
                                style={{ 
                                    animationDuration: `${speedConfig.duration}s`, 
                                    animationDelay: `${initialDelay + (index * speedConfig.delay)}s` 
                                }} 
                            />
                        ))}
                    </svg>
                </div>
    
                <div className="flex justify-center gap-2 w-full px-2">
                    <button 
                        onClick={() => handleReplay('slow')}
                        title="Tua chậm"
                        className={`py-2 px-3 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 ${activeSpeed === 'slow' ? 'bg-indigo-100 text-indigo-700 font-bold ring-1 ring-indigo-300' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 shadow-sm'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                        <span className="text-[10px] font-bold uppercase">Chậm</span>
                    </button>
    
                    <button 
                        onClick={() => handleReplay('normal')}
                        title="Vẽ lại"
                        className={`py-2 px-4 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${activeSpeed === 'normal' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        <span className="text-[10px] font-bold uppercase">Vẽ lại</span>
                    </button>
    
                    <button 
                        onClick={() => handleReplay('fast')}
                        title="Tua nhanh"
                        className={`py-2 px-3 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 ${activeSpeed === 'fast' ? 'bg-indigo-100 text-indigo-700 font-bold ring-1 ring-indigo-300' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 shadow-sm'}`}
                    >
                        <span className="text-[10px] font-bold uppercase">Nhanh</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                    </button>
                </div>
            </div>
        </div>
    );
    };
        
    const HeaderSection = ({ char, paths, loading, failed, config, dbData }) => {
    const readings = useKanjiReadings(char, config.showOnKun, dbData);
    
    if (loading) return <div className="h-[22px] w-full animate-pulse bg-gray-100 rounded mb-1"></div>;
    if (failed) return <div className="h-[22px] w-full mb-1"></div>;
    
    // Thêm tiền tố dbData. vào trước các biến
    const info = dbData.KANJI_DB[char] || dbData.ALPHABETS.hiragana[char] || dbData.ALPHABETS.katakana[char];
    
    const isJLPT = dbData.KANJI_LEVELS.N5.includes(char) || 
                dbData.KANJI_LEVELS.N4.includes(char) || 
                dbData.KANJI_LEVELS.N3.includes(char) || 
                dbData.KANJI_LEVELS.N2.includes(char) || 
                dbData.KANJI_LEVELS.N1.includes(char);
    
    return (
    <div 
        className="flex flex-row items-end px-1 mb-1 h-[22px] overflow-hidden border-b border-transparent"
        style={{ width: '184mm', minWidth: '184mm', maxWidth: '184mm' }}
    >
        {/* 1. ÂM HÁN VIỆT + NGHĨA (Luôn hiện nếu có dữ liệu) */}
        {info && (
        <div className="flex-shrink-0 mr-4 flex items-baseline gap-2 mb-[3px]">
            <span className="font-bold text-sm leading-none text-black whitespace-nowrap uppercase">
            {info.sound}
            </span>
            {info.meaning && info.meaning.trim() !== "" && (
            <span className="text-[12px] font-normal text-black leading-none whitespace-nowrap">
                ({info.meaning})
            </span>
            )}
        </div>
        )}
    
        {/* 2. PHẦN LOGIC THAY ĐỔI THEO NÚT GẠT */}
        <div className="flex-1 min-w-0 h-[22px]"> 
        {(() => {
            // TRƯỜNG HỢP 1: Nếu nút gạt đang TẮT (Mặc định)
            // Hiện thứ tự nét vẽ cho TẤT CẢ các chữ (Kanji, Kana...)
            if (!config.showOnKun) {
            return (
                <div className="h-full flex items-center flex-wrap gap-1">
                {paths.map((_, i) => (
                    <div key={i} className="w-[22px] h-[22px] flex-shrink-0">
                    <svg viewBox="0 0 109 109" className="decomp-svg">
                        {paths.slice(0, i + 1).map((d, pIndex) => (
                        <path key={pIndex} d={d} />
                        ))}
                    </svg>
                    </div>
                ))}
                </div>
            );
            }
    
            // TRƯỜNG HỢP 2: Nếu nút gạt đang BẬT
            // A. Nếu là Kanji thuộc N1-N5: Hiện âm On/Kun
            if (isJLPT) {
            return (
                <div className="h-full flex items-end pb-[3px] text-[12px] text-black italic w-full leading-none whitespace-nowrap">
                <div className="truncate w-full">
                <span className="font-bold text-black mr-1 uppercase">On:</span>
                <span className="mr-3 not-italic font-medium">{readings.on || '---'}</span>
                <span className="font-bold text-black mr-1 uppercase">Kun:</span>
                <span className="not-italic font-medium">{readings.kun || '---'}</span>
                </div>
                </div>
            );
            }
    
            // B. Nếu KHÔNG phải Kanji N1-N5 (Hiragana, Katakana, chữ khác): Ẩn hoàn toàn nét vẽ
            return null;
        })()}
        </div>
    </div>
    );
    };
    // 2. GridBox (Đã thêm class reference-box và chỉnh Hover xanh nhạt)
    const GridBox = ({ char, type, config, index, svgData, failed, onClick }) => {
    const isReference = type === 'reference';
    const showTrace = index < config.traceCount;
    const { gridType, gridOpacity } = config; 
    
    const gridColor = `rgba(0, 0, 0, ${gridOpacity})`;
    
    const refStyle = isReference ? {
        '--guide-scale': config.guideScale,
        '--guide-x': `${config.guideX}px`,
        '--guide-y': `${config.guideY}px`
    } : {};
    
    return (
        <div 
        // THÊM: class 'reference-box' (quan trọng để đổi màu chữ)
        // SỬA: hover:bg-indigo-50 (nền xanh nhạt)
        className={`relative w-[16mm] h-[16mm] border-r border-b box-border flex justify-center items-center overflow-hidden bg-transparent ${isReference ? 'reference-box cursor-pointer hover:bg-indigo-50 transition-colors duration-200' : ''}`}
        style={{ borderColor: gridColor }}
        onClick={isReference ? onClick : undefined} 
        title={isReference ? "Bấm để xem cách viết" : ""}
        >
        
        <div className="absolute inset-0 pointer-events-none z-0">
            {gridType !== 'blank' && (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="50" y1="0" x2="50" y2="100" stroke="black" strokeOpacity={gridOpacity} strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="black" strokeOpacity={gridOpacity} strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>
            )}
        </div>
    
        {char && (
            <>
            {isReference && (
                <div className="relative z-20 w-full h-full flex items-center justify-center p-[1px]">
                    {!failed && svgData ? (
                    <div className="ref-wrapper" style={refStyle} dangerouslySetInnerHTML={{ __html: svgData }} />
                    ) : (
                    <span className="kanji-trace !text-black flex justify-center items-center h-full w-full"
                        style={{ fontSize: `${config.fontSize}pt`, color: 'black', transform: `translateY(${config.verticalOffset}px)`, textShadow: 'none', webkitTextStroke: '0' }}>
                        {char}
                    </span>
                    )}
                    
                    {/* Icon bàn tay gợi ý (ẩn đi vì đã có hiệu ứng đổi màu chữ làm tín hiệu) */}
                    <div className="absolute bottom-0.5 right-0.5 opacity-0 hover:opacity-0 text-indigo-400 pointer-events-none transition-opacity">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    </div>
                </div>
            )}
    
            {!isReference && showTrace && (
                <span className="kanji-trace"
                style={{
                    fontSize: `${config.fontSize}pt`,
                    transform: `translateY(${config.verticalOffset}px)`,
                    color: `rgba(0, 0, 0, ${config.traceOpacity})`,
                    //fontFamily: config.fontFamily
                }}
                >
                {char}
                </span>
            )}
            </>
        )}
        </div>
    );
    };
    
    // 3. WorkbookRow (Cập nhật truyền props cho Modal mới)
        const WorkbookRow = ({ char, config, dbData }) => {
        const { loading, paths, fullSvg, failed } = useKanjiSvg(char);
        const boxes = Array.from({ length: 12 }, (_, i) => i);
        const gridBorderColor = `rgba(0, 0, 0, ${config.gridOpacity})`;
        
        const [isAnimOpen, setIsAnimOpen] = useState(false);
    
        return (
            <div className="flex flex-col w-full px-[8mm]">
                <HeaderSection 
                    char={char} 
                    paths={paths} 
                    loading={loading} 
                    failed={failed} 
                    config={config} 
                    dbData={dbData}
                />
            
                <div className="flex border-l border-t w-fit" style={{ borderColor: gridBorderColor }}>
                    {boxes.map((i) => (
                    <GridBox
                        key={i}
                        index={i}
                        char={char}
                        type={i === 0 ? 'reference' : 'trace'}
                        config={config}
                        svgData={fullSvg}
                        failed={failed}
                        onClick={i === 0 ? () => setIsAnimOpen(true) : undefined}
                    />
                    ))}
                </div>
    
                {/* Modal nhận thêm fullSvg và dbData */}
                <KanjiAnimationModal 
                    char={char}
                    paths={paths}
                    fullSvg={fullSvg}  // <-- Truyền chuỗi SVG gốc để lấy số
                    dbData={dbData}    // <-- Truyền data để lấy Âm/Nghĩa
                    isOpen={isAnimOpen}
                    onClose={() => setIsAnimOpen(false)}
                />
            </div>
        );
    };
    
        // 4. Page Layout (Đã cập nhật giao diện Bản Mẫu)
        const Page = ({ chars, config, dbData }) => {
        // Kiểm tra xem có phải đang ở chế độ bản mẫu (không có text) hay không
        const isSample = !config.text || config.text.trim().length === 0;
    
        return (
            <div className="a4-page mx-auto relative flex flex-col pt-[15mm] pl-[3mm] bg-white">
            
            {/* --- PHẦN TIÊU ĐỀ BẢN MẪU (CHỈ HIỆN KHI TRỐNG) --- */}
            {isSample && (
                <div className="w-full max-w-[210mm] mb-6 text-left pl-[8mm]">
                    <h2 className="text-xl font-black text-gray-600 uppercase mb-3 font-sans tracking-wide">
                        HƯỚNG DẪN
                    </h2>
                    <div className="text-sm text-gray-500 font-medium space-y-1.5 font-sans">
                       <p className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">1</span>
                            <span><span className="font-bold">Nhập dữ liệu</span> để tạo file luyện viết.</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">2</span>
                            <span>Ấn vào <span className="font-bold">chữ mẫu đầu tiên</span> để xem họa hoạt cách viết.</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">3</span>
                            <span>Tạo nhanh <span className="font-bold">Flashcard</span> trong phần "tiện ích".</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">4</span>
                            <span>Chế độ <span className="font-bold">ÔN TẬP THÔNG MINH</span> (lặp lại ngắt quãng) được tích hợp vào Flashcard.</span>
                        </p>
                    </div>
                </div>
            )}
    
            {/* DANH SÁCH CÁC DÒNG */}
            <div className="flex flex-col gap-[4mm]">
                {chars.map((char, index) => (
                <WorkbookRow
                    key={`${index}-${char}`}
                    char={char}
                    config={config}
                    dbData={dbData}
                />
                ))}
            </div>
    
            {/* Branding Footer */}
            <div className="absolute bottom-[5mm] left-[12.5mm] text-gray-600 text-xs font-sans">
                {/* Dòng 1 */}
                <div className="text-[10px]">
                    © Bản quyền thuộc <span className="font-bold text-gray-700">Phá Đảo Tiếng Nhật</span> 
                    <span> (<span className="font-bold italic text-gray-700">phadaotiengnhat.com</span>)</span>
                </div>
                
                {/* Dòng 2 */}
                <div className="text-[10px] mt-0.5">
                    Tài liệu miễn phí - Nghiêm cấm mọi hành vi mua bán thương mại
                </div>
            </div>
            </div>
        );
        };
    
    // 5. Sidebar (Phiên bản: Final)
        const Sidebar = ({ config, onChange, onPrint, srsData, isMenuOpen, setIsMenuOpen, isConfigOpen, setIsConfigOpen, isCafeModalOpen, setIsCafeModalOpen, showMobilePreview, setShowMobilePreview, dbData, setIsFlashcardOpen, onOpenReviewList }) => {
       // --- BƯỚC 2: TÌM TRONG COMPONENT SIDEBAR -> SỬA BIẾN dueChars ---
    
    // 1. Logic bộ lọc mới
    const dueChars = useMemo(() => {
        const now = Date.now();
        return Object.keys(srsData || {}).filter(char => {
            const data = srsData[char];
            // Điều kiện: Chưa hoàn thành VÀ (Là chữ đang học HOẶC Đã đến giờ ôn)
            return !data.isDone && data.nextReview !== null && (data.nextReview === 0 || data.nextReview <= now);
        });
    }, [srsData]);
    
    // 2. Hàm Load bài mới (Load xong mở ngay)
    const handleLoadDueCards = () => {
        if (dueChars.length === 0) return;
        const dueText = dueChars.join('');
        onChange({ ...config, text: dueText }); 
        setTimeout(() => { setIsFlashcardOpen(true); }, 50); 
    };
            
            const scrollRef = useRef(null);
        const [searchResults, setSearchResults] = useState([]);
        const [activeIndex, setActiveIndex] = useState(0); 
        const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
        const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
        
        // --- CHẶN TUYỆT ĐỐI CTRL + P (KHÔNG CÓ GÌ XẢY RA) ---
        useEffect(() => {
        const handleKeyDown = (e) => {
            // Kiểm tra Ctrl + P (Win) hoặc Command + P (Mac)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
            e.preventDefault(); // Chặn trình duyệt mở bảng in
            e.stopPropagation(); // Chặn sự kiện lan truyền
            return false; // Kết thúc ngay lập tức, không làm gì cả
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        }, []);
        
    // --- CHẶN CUỘN TRANG KHI MỞ MODAL ---
    useEffect(() => {
    // Nếu khung In hoặc khung Tài liệu đang mở
    if (isPrintModalOpen || isDocsModalOpen) {
        document.body.style.overflow = 'hidden'; // Khóa cuộn
    } else {
        document.body.style.overflow = 'unset';  // Mở lại cuộn bình thường
    }
    // Dọn dẹp khi tắt
    return () => { document.body.style.overflow = 'unset'; };
    }, [isPrintModalOpen, isDocsModalOpen]);
    
    
        useEffect(() => {
    if (scrollRef.current) {
        const activeItem = scrollRef.current.childNodes[activeIndex];
        if (activeItem) {
            // Tự động cuộn đến mục đang chọn (block: 'nearest' để mượt hơn)
            activeItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
    }, [activeIndex]); // Chạy lại mỗi khi activeIndex thay đổi
    
        // --- STATE QUẢN LÝ ---
        const [isLoading, setIsLoading] = useState(false);
        const [progress, setProgress] = useState(0);
        const [searchTerm, setSearchTerm] = useState('');
    
        // --- HÀM KIỂM TRA CẤP ĐỘ JLPT ---
    const getJLPTLevel = (char) => {
    if (dbData.KANJI_LEVELS.N5.includes(char)) return 'N5';
    if (dbData.KANJI_LEVELS.N4.includes(char)) return 'N4';
    if (dbData.KANJI_LEVELS.N3.includes(char)) return 'N3';
    if (dbData.KANJI_LEVELS.N2.includes(char)) return 'N2';
    if (dbData.KANJI_LEVELS.N1.includes(char)) return 'N1';
    return null;
    };
    
    const levelColors = {
    N5: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600',
    N4: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600',
    N3: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-600 hover:text-white hover:border-orange-600',
    N2: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600',
    N1: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600'
    };
    
        
        // Menu Popup & Ref
        const [isUtilsOpen, setIsUtilsOpen] = useState(false);
        const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
        const filterRef = useRef(null);
        const quickMenuRef = useRef(null); // THÊM: Ref cho menu Chọn nhanh
        const utilsMenuRef = useRef(null); // THÊM: Ref cho menu Tiện ích
        const cafeModalRef = useRef(null);
        const searchInputRef = useRef(null); // Tạo "địa chỉ" cho ô nhập liệu
        const configMenuRef = useRef(null);
        // Biến kiểm soát bộ gõ IME (Quan trọng)
        const isComposing = useRef(false);
    
        const [randomCount, setRandomCount] = useState(10); 
    
        // State hiển thị nội bộ
        const [localText, setLocalText] = useState(config.text);
    
        // Tùy chọn bộ lọc
        const [filterOptions, setFilterOptions] = useState({
            hiragana: true,
            katakana: true,
            kanji: true,
            removeDuplicates: false 
        });
    
        // --- HÀM TẠO PLACEHOLDER ---
        const getDynamicPlaceholder = () => {
            const labels = [];
            if (filterOptions.kanji) labels.push("漢字");        
            if (filterOptions.hiragana) labels.push("ひらがな"); 
            if (filterOptions.katakana) labels.push("カタカナ"); 
            
            if (labels.length === 0) return "Vui lòng chọn ít nhất 1 loại chữ...";
            return labels.join(", ");
        };
    
        // --- 1. CLICK RA NGOÀI ĐỂ ĐÓNG MENU ---
        // --- XỬ LÝ CLICK RA NGOÀI ĐỂ ĐÓNG MENU ---
    useEffect(() => {
    function handleClickOutside(event) {
        // 1. Xử lý Bộ lọc (Filter)
        if (filterRef.current && !filterRef.current.contains(event.target)) {
            setIsFilterMenuOpen(false);
        }
    
        // 2. Xử lý "Chọn nhanh" (Quick Select) - Tự đóng khi click ra ngoài
        if (isMenuOpen && quickMenuRef.current && !quickMenuRef.current.contains(event.target)) {
            setIsMenuOpen(false);
        }
    
        // 3. Xử lý "Tiện ích" (Utils) - Tự đóng khi click ra ngoài
        if (isUtilsOpen && utilsMenuRef.current && !utilsMenuRef.current.contains(event.target)) {
            setIsUtilsOpen(false);
        }
        if (isCafeModalOpen && cafeModalRef.current && !cafeModalRef.current.contains(event.target)) {
            setIsCafeModalOpen(false);
        }
        // 5. MỚI: Xử lý "Tùy chỉnh" - Tự đóng khi click ra ngoài
        if (isConfigOpen && configMenuRef.current && !configMenuRef.current.contains(event.target)) {
            setIsConfigOpen(false);
        }
    
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen, isUtilsOpen, isFilterMenuOpen, isCafeModalOpen, isConfigOpen]); // Thêm dependencies để cập nhật trạng thái mới nhất
    
        // --- 2. ĐỒNG BỘ DỮ LIỆU TỪ NGOÀI ---
        useEffect(() => {
            const currentClean = localText ? localText.replace(/[a-zA-Z]/g, '') : '';
            if (currentClean !== config.text) {
                setLocalText(config.text);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [config.text]);
    
        const handleChange = (key, value) => {
            onChange({ ...config, [key]: value });
        };
    
        const shuffleString = (str) => {
            const arr = [...str];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr.join('');
        };
    
        // --- HÀM TRỢ GIÚP: REGEX ---
        const getAllowedRegexString = (options, allowLatin = false) => {
            let ranges = "\\s"; 
            if (allowLatin) ranges += "a-zA-Z"; // Latinh luôn được phép ở input
    
            if (options.hiragana) ranges += "\\u3040-\\u309F";
            if (options.katakana) ranges += "\\u30A0-\\u30FF";
            if (options.kanji)    ranges += "\\u4E00-\\u9FAF\\u3400-\\u4DBF\\u2E80-\\u2FDF\\uF900-\\uFAFF"; 
            return ranges;
        };
        // --- HÀM TRỢ GIÚP: XÓA TRÙNG LẶP ---
            const getUniqueChars = (str) => {
                return Array.from(new Set(str)).join('');
                };
    
        // --- 3. XỬ LÝ CHECKBOX ---
        const handleFilterChange = (key) => {
            const newOptions = { ...filterOptions, [key]: !filterOptions[key] };
            setFilterOptions(newOptions);
            
            let newText = localText;
    
            // Xử lý các ô Hiragana/Katakana/Kanji (như cũ)
            if (['hiragana', 'katakana', 'kanji'].includes(key) && filterOptions[key] === true) {
                const allowedString = getAllowedRegexString(newOptions, true); 
                const regex = new RegExp(`[^${allowedString}]`, 'g');
                newText = newText.replace(regex, '');
            }
    
            // Xử lý ô Xóa trùng lặp (MỚI)
            if (newOptions.removeDuplicates) {
                newText = getUniqueChars(newText);
            }
            
            setLocalText(newText);
            handleChange('text', newText.replace(/[a-zA-Z]/g, ''));
        };
    
    // --- 4. NÚT XÓA LATINH + DỒN DÒNG (PHIÊN BẢN XÓA SẠCH SÀNH SANH) ---
        const handleRemoveLatinManual = () => {
            if (!localText) return;
            let cleaned = localText;
            
            // 1. Xóa chữ cái Latinh
            cleaned = cleaned.replace(/[a-zA-Z]/g, '');
            
            // 2. Xóa hết dấu xuống dòng (Enter) -> Thay bằng rỗng ''
            cleaned = cleaned.replace(/[\n\r]+/g, '');
            
            // 3. Xóa hết các loại dấu cách (thường, tab, Nhật) -> Thay bằng rỗng ''
            // Regex này bao gồm: dấu cách thường ( ), dấu cách Nhật (　), và tab (\t)
            cleaned = cleaned.replace(/[ 　\t]+/g, ''); 
            
            // Cắt khoảng trắng thừa 2 đầu (nếu còn sót)
            cleaned = cleaned.trim();
    
            setLocalText(cleaned);
            handleChange('text', cleaned); 
        };
    
        // --- 5. XỬ LÝ NHẬP LIỆU (ĐÃ FIX LỖI IME) ---
        // --- 5. XỬ LÝ NHẬP LIỆU (REAL-TIME FILTER) ---
        const handleInputText = (e) => {
            const rawInput = e.target.value;
    
            // Nếu đang lơ lửng gõ bộ gõ (IME) thì cứ để hiện
            if (isComposing.current) {
                setLocalText(rawInput);
                return;
            }
            
            // 1. Lọc ký tự rác (số, icon...)
            const allowedString = getAllowedRegexString(filterOptions, true);
            const blockRegex = new RegExp(`[^${allowedString}]`, 'g');
            let validForInput = rawInput.replace(blockRegex, '');
    
            // 2. LOGIC QUAN TRỌNG: Lọc trùng ngay lập tức
            if (filterOptions.removeDuplicates) {
                validForInput = getUniqueChars(validForInput);
            }
    
            setLocalText(validForInput);
            handleChange('text', validForInput.replace(/[a-zA-Z]/g, ''));
        };
    
        const handleCompositionStart = () => {
            isComposing.current = true;
        };
    
        const handleCompositionEnd = (e) => {
            isComposing.current = false;
            
            // Lấy toàn bộ nội dung trong ô nhập lúc này
            const rawInput = e.target.value;
            
            // 1. Lọc rác
            const allowedString = getAllowedRegexString(filterOptions, true);
            const blockRegex = new RegExp(`[^${allowedString}]`, 'g');
            let validForInput = rawInput.replace(blockRegex, '');
    
            // 2. LOGIC QUAN TRỌNG: Lọc trùng ngay khi chốt chữ
            if (filterOptions.removeDuplicates) {
                validForInput = getUniqueChars(validForInput);
            }
    
            setLocalText(validForInput);
            handleChange('text', validForInput.replace(/[a-zA-Z]/g, ''));
        };
    // Thêm tham số type (mặc định là 'kanji')
    const handleLoadFromGithub = async (url, type = 'kanji') => {
    setProgress(0);
    setIsLoading(true);      
    setIsMenuOpen(false);    
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Lỗi tải dữ liệu từ ${url}`);
        }
    
        const rawText = await response.text();
        const cleanText = rawText.replace(/["\n\r\s,\[\]]/g, '');
    
        if (!cleanText) {
                alert("File dữ liệu rỗng!");
                setIsLoading(false);
                return;
        }
    
        
        setFilterOptions(prev => ({ ...prev, [type]: true })); 
        
        setProgress(30);
        setTimeout(() => setProgress(100), 300);
    
        setTimeout(() => {
            setLocalText(cleanText);              
            onChange({ ...config, text: cleanText }); 
            setIsLoading(false);                  
        }, 500);
    
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không tải được dữ liệu. Vui lòng kiểm tra lại đường truyền hoặc link GitHub.");
        setIsLoading(false);
    }
    };
        // --- HÀM MỚI: Lấy ngẫu nhiên Kanji từ GitHub ---
        const handleRandomLoadFromGithub = async (level) => {
            // 1. Kiểm tra số lượng
            if (randomCount === '' || randomCount <= 0) {
                alert("Vui lòng nhập số lượng chữ cần lấy!");
                return;
            }
            setProgress(0);
    
            // 2. Tạo link file: kanjin5.json...
            const fileName = `kanji${level.toLowerCase()}.json`; 
            const url = `./data/${fileName}`;
    
            setIsLoading(true);
             // Đóng menu Tiện ích
            setIsMenuOpen(false)
            
            try {
                // 3. Tải file về
                const response = await fetch(url);
                if (!response.ok) throw new Error("Lỗi tải file");
                
                const rawText = await response.text();
                const cleanText = rawText.replace(/["\n\r\s]/g, '');
    
                if (!cleanText) {
                        alert("File dữ liệu rỗng!");
                        setIsLoading(false);
                        return;
                }
    
                // 4. Xáo trộn và cắt lấy số lượng cần thiết
                const shuffled = shuffleString(cleanText); // Hàm shuffleString có sẵn trong code cũ rồi
                let count = randomCount > 50 ? 50 : randomCount;
                const selectedChars = shuffled.slice(0, count);
    
                // 5. Hiển thị
                setFilterOptions(prev => ({ ...prev, kanji: true }));
                
                setProgress(30);
                setTimeout(() => setProgress(100), 300);
    
                setTimeout(() => {
                    setLocalText(selectedChars);
                    onChange({ ...config, text: selectedChars });
                    setIsLoading(false);
                }, 500);
    
            } catch (error) {
                console.error(error);
                alert(`Không tải được dữ liệu ${level}. Kiểm tra lại mạng hoặc link GitHub.`);
                setIsLoading(false);
            }
        };
        // --- 6. XỬ LÝ RỜI TAY ---
        const handleBlurText = () => {
            if (!localText) return;
            let cleaned = localText; 
            cleaned = cleaned.replace(/[ \t]+/g, ' '); 
            cleaned = cleaned.replace(/(\n\s*){2,}/g, '\n'); 
            cleaned = cleaned.trim();
    
            if (filterOptions.removeDuplicates) {
                cleaned = getUniqueChars(cleaned);
            }
    
            if (cleaned !== localText) {
                setLocalText(cleaned);
                handleChange('text', cleaned.replace(/[a-zA-Z]/g, ''));
            }
        };
    
        // --- CÁC HÀM TIỆN ÍCH KHÁC ---
        const handleSmartLoad = (content, type = null) => {
            if (!content) return;
            setIsLoading(true); setIsMenuOpen(false); setIsUtilsOpen(false); setIsConfigOpen(false); setProgress(0);
            
            if (type) setFilterOptions(prev => ({ ...prev, [type]: true }));
            else if (type === 'all') setFilterOptions(prev => ({ ...prev, kanji: true }));
    
            const interval = setInterval(() => {
                setProgress((prev) => { if (prev >= 90) return 90; return prev + Math.floor(Math.random() * 10) + 5; });
            }, 80);
            setTimeout(() => {
                setLocalText(content);
                onChange({ ...config, text: content });
                clearInterval(interval); setProgress(100); setTimeout(() => setIsLoading(false), 200);
            }, 600);
        };
    
    
        const handleShuffleCurrent = () => {
            if (!config.text) { alert("Chưa có nội dung!"); return; }
            handleSmartLoad(shuffleString(config.text));
        };
    
        // Hàm xử lý tìm kiếm thời gian thực
    const handleSearchRealtime = (val) => {
    setSearchTerm(val);
    const query = val.toLowerCase().trim();
    const queryNoAccent = removeAccents(query);
    
    if (!query) {
        setSearchResults([]);
        return;
    }
    
    const matches = [];
    const processData = (source, type) => {
        Object.entries(source).forEach(([char, info]) => {
            if (info.sound) {
                const sound = info.sound.toLowerCase();
                const soundNoAccent = removeAccents(sound);
    
                // Tính toán trọng số ưu tiên (Càng thấp càng đứng đầu)
                let priority = 99;
    
                if (sound === query) priority = 1; // 1. Khớp chính xác (An -> AN)
                else if (soundNoAccent === queryNoAccent) priority = 2; // 2. Khớp chính xác không dấu (An -> ÁN)
                else if (sound.includes(query)) priority = 3; // 3. Chứa vần chính xác (An -> SAN)
                else if (soundNoAccent.includes(queryNoAccent)) priority = 4; // 4. Chứa vần không dấu (An -> HÁN)
    
                if (priority < 99) {
                    matches.push({ char, ...info, type, priority, sound });
                }
            }
        });
    };
    
    processData(dbData.KANJI_DB, 'kanji');
    
    // Sắp xếp theo trọng số, nếu cùng trọng số thì xếp theo Alphabet
    matches.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.sound.localeCompare(b.sound);
    });
    
    setSearchResults(matches.slice(0, 20));
    setActiveIndex(0); // Reset về vị trí đầu tiên
    };
    
        // --- HÀM CHỌN CHỮ TỪ GỢI Ý (ĐÃ FIX LỖI TRÙNG LẶP) ---
    const selectResult = (item) => {
    // 1. Tạo chuỗi mới bằng cách cộng chữ vừa chọn vào cuối
    let newText = config.text + item.char;
    
    // 2. KIỂM TRA: Nếu đang bật tính năng "Xóa trùng lặp" thì lọc chuỗi ngay
    if (filterOptions.removeDuplicates) {
        newText = getUniqueChars(newText);
    }
    
    // 3. Cập nhật vào giao diện và dữ liệu hệ thống
    setLocalText(newText);
    handleChange('text', newText);
    
    // 4. Reset ô tìm kiếm
    setSearchTerm('');
    setSearchResults([]);
    setActiveIndex(0);
    
    // 5. Tự động bật bộ lọc tương ứng 
    if (item.type === 'kanji') setFilterOptions(p => ({...p, kanji: true}));
    else if (item.char.match(/[\u3040-\u309F]/)) setFilterOptions(p => ({...p, hiragana: true}));
    else setFilterOptions(p => ({...p, katakana: true}));
    };
        
        const toggleMenu = (menuName) => {
            setIsCafeModalOpen(false); 
            setIsFilterMenuOpen(false); 
            if (menuName === 'quick') { setIsMenuOpen(!isMenuOpen); setIsUtilsOpen(false); setIsConfigOpen(false); }
            else if (menuName === 'utils') { setIsUtilsOpen(!isUtilsOpen); setIsMenuOpen(false); setIsConfigOpen(false); }
            else if (menuName === 'config') { setIsConfigOpen(!isConfigOpen); setIsMenuOpen(false); setIsUtilsOpen(false); }
        };
    
        // Check warning để đổi font placeholder
        const isWarningMode = !filterOptions.hiragana && !filterOptions.katakana && !filterOptions.kanji;
    
        return (
            <div className="w-full md:w-96 bg-white shadow-xl p-6 flex flex-col gap-6 h-auto md:h-screen md:overflow-y-auto relative md:sticky top-0 border-r border-gray-200 z-50 hide-scrollbar">
            
            {/* HEADER */}
            <div className="mb-4 pb-3 border-b border-gray-100"> 
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                <span className="text-2xl leading-none -mt-1">⛩️</span>
                TẠO FILE LUYỆN VIẾT KANJI
                </h1>
            </div>
    
            <div className="space-y-6 flex-1">
                
            {/* TÌM KIẾM THÔNG MINH (BƯỚC 3) */}
    <div className="space-y-1.5 pb-2 mb-2 relative">
    <div className="flex gap-2">
    <div className="relative flex-1">
    {/* Icon Kính lúp (Bên trái) */}
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
    </div>
    
    {/* Ô Input */}
    <input 
        ref={searchInputRef}
        type="text" 
        value={searchTerm} 
        className="w-full pl-10 pr-10 py-2 border border-indigo-200 rounded-lg text-[16px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50 text-indigo-900 placeholder-indigo-400 font-bold font-sans" 
        placeholder="Tìm Kanji theo âm Hán Việt" 
        onChange={(e) => handleSearchRealtime(e.target.value)} 
        onKeyDown={(e) => {
            if (searchResults.length > 0) {
                if (e.key === 'ArrowDown') { 
                    e.preventDefault(); 
                    setActiveIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0)); 
                } else if (e.key === 'ArrowUp') { 
                    e.preventDefault(); 
                    setActiveIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1)); 
                } else if (e.key === 'Enter') { 
                    e.preventDefault(); 
                    selectResult(searchResults[activeIndex]); 
                }
            }
        }}
    />
    
    {/* NÚT X ĐỂ XÓA (MỚI THÊM) - Chỉ hiện khi đang có chữ */}
    {searchTerm && (
        <button 
            onClick={() => {
                setSearchTerm('');    // Xóa chữ
                setSearchResults([]); // Đóng danh sách gợi ý
                searchInputRef.current.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
            title="Xóa tìm kiếm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    )}
    </div>
    </div>
    
    {/* DROPDOWN KẾT QUẢ GỢI Ý - CHỈ HIỆN KHI CÓ KẾT QUẢ */}
    {searchResults.length > 0 && (
        <div 
        ref={scrollRef}
        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[70] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
    {searchResults.map((item, idx) => {
    const level = getJLPTLevel(item.char); // Kiểm tra cấp độ N1-N5
    
    return (
        <div 
            key={idx} 
            onClick={() => selectResult(item)}
            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-50 last:border-none transition-colors group ${
                idx === activeIndex ? 'bg-indigo-100' : 'bg-white hover:bg-indigo-50'
            }`}
        >
            {/* Chữ hiển thị */}
            <span className="text-2xl font-['Klee_One'] text-black group-hover:scale-110 transition-transform">
                {item.char}
            </span>
    
            {/* Âm Hán và nghĩa */}
            <div className="flex flex-col">
                <span className="text-[11px] font-black text-indigo-600 uppercase leading-tight">
                    {item.sound}
                </span>
                {item.meaning && (
                    <span className="text-[10px] text-gray-400 font-medium leading-tight">
                        {item.meaning}
                    </span>
                )}
            </div>
    
            {/* NHÃN MÁC (Badge) */}
            <div className="ml-auto">
                {level ? (
                    /* Nếu thuộc danh sách Kanji N1-N5 */
                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition-all duration-200 ${levelColors[level]}`}>
                        {level}
                    </div>
                ) : (
                    /* Nếu KHÔNG thuộc N1-N5 -> Mặc định hiện mác BỘ THỦ */
                    <div className="px-1.5 py-0.5 rounded text-[9px] font-black border bg-gray-100 text-gray-500 border-gray-200 uppercase transition-all duration-200 hover:bg-gray-500 hover:text-white hover:border-gray-500 cursor-default">
                        Bộ thủ
                    </div>
                )}
            </div>
        </div>
    );
    })}
        </div>
    )}
    
    </div>
    
                {/* KHUNG NHẬP LIỆU */}
                <div className="space-y-2 pt-2">
                    {/* --- TIÊU ĐỀ & CÁC NÚT (ĐÃ CHỈNH SỬA GIAO DIỆN) --- */}
                    <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 font-sans">Nhập dữ liệu</label>
                    
                    {/* CỤM NÚT BỘ LỌC VÀ XÓA */}
                    <div className="flex items-center gap-3 relative">
                        
                        {/* 1. NÚT MỞ BỘ LỌC */}
                        <div className="relative" ref={filterRef}>
                            <button 
                                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors ${isFilterMenuOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-700'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Bộ lọc
                            </button>
    
                            {/* POPUP MENU BỘ LỌC */}
                            {isFilterMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">BỘ LỌC</span>
                                        <div className="group relative cursor-help">
                                            <div className="text-gray-400 hover:text-indigo-500 border border-gray-300 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-serif font-bold bg-gray-50">i</div>
                                            {/* Tooltip chữ i */}
                                            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-[60]">
                                                1. Bỏ tích ô nào, chữ loại đó sẽ bị xóa ngay lập tức khỏi ô nhập liệu. <br/>
                                                2. "LÀM SẠCH" sẽ xóa hết chữ latinh, khoảng trắng thừa trong ô nhập liệu.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-indigo-600 select-none">
                                            <input type="checkbox" checked={filterOptions.kanji} onChange={() => handleFilterChange('kanji')} className="accent-indigo-600 w-3.5 h-3.5 rounded-sm"/>
                                            Kanji & Bộ thủ
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-indigo-600 select-none">
                                            <input type="checkbox" checked={filterOptions.hiragana} onChange={() => handleFilterChange('hiragana')} className="accent-indigo-600 w-3.5 h-3.5 rounded-sm"/>
                                            Hiragana
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-indigo-600 select-none">
                                            <input type="checkbox" checked={filterOptions.katakana} onChange={() => handleFilterChange('katakana')} className="accent-indigo-600 w-3.5 h-3.5 rounded-sm"/>
                                            Katakana
                                        </label>
                                        {/* ĐƯỜNG KẺ MỜ NGĂN CÁCH (MỚI) */}
                                        <hr className="border-gray-100 my-1"/>
    
    {/* TÙY CHỌN: XÓA TRÙNG LẶP (ĐỔI MÀU ĐỘNG) */}
    <label className={`flex items-center gap-2 text-xs cursor-pointer select-none transition-colors ${
    filterOptions.removeDuplicates 
        ? 'text-red-500 hover:text-red-600'  // Khi ĐANG TÍCH: Màu đỏ đậm
        : 'text-gray-700 hover:text-indigo-600'        // Khi KHÔNG TÍCH: Màu xám bình thường
    }`}>
    <input 
        type="checkbox" 
        checked={filterOptions.removeDuplicates} 
        onChange={() => handleFilterChange('removeDuplicates')} 
        className={`w-3.5 h-3.5 rounded-sm ${
            filterOptions.removeDuplicates ? 'accent-red-500' : 'accent-indigo-500'
        }`}
    />
    Xóa chữ trùng lặp
    </label>
                                        
                                        <hr className="border-gray-100"/>
                                        
    {/* NÚT LÀM SẠCH  */}
    <button 
    onClick={handleRemoveLatinManual} 
    className="w-full py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center gap-1 transition">
    LÀM SẠCH
    </button>
                                    </div>
                                </div>
                            )}
                        </div>
    
                        {/* 2. NÚT XÓA TẤT CẢ */}
                        <button onClick={() => { setLocalText(''); handleChange('text', ''); }} className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-tighter">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> XÓA TẤT CẢ
                        </button>
                    </div>
                    </div>
                    <textarea 
                    className={`w-full h-[104px] p-3 pr-1 border border-gray-300 rounded-lg resize-none text-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner input-scrollbar ${(isWarningMode && !localText) ? 'font-sans' : "font-['Klee_One']"}`}
                    placeholder={getDynamicPlaceholder()} 
                    value={localText} 
                    onChange={handleInputText} 
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    onBlur={handleBlurText}    
                    />
                </div>
                
               {dueChars.length > 0 && (
        <div className="mb-6 animate-in slide-in-from-top duration-500">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center animate-bounce shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 8 4 4-4 4"/><path d="M8 12h7"/><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10z"/></svg>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Hệ thống nhắc nhở</p>
                        <p className="text-sm font-black text-orange-700">CẦN ÔN {dueChars.length} CHỮ!</p>
                    </div>
                </div>
                
                {/* NÚT CHIA ĐÔI */}
                <div className="flex gap-2">
                    <button onClick={handleLoadDueCards} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black rounded-xl transition-all shadow-md shadow-orange-200 active:scale-95 uppercase">
                        Ôn ngay
                    </button>
                    <button onClick={onOpenReviewList} className="flex-1 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-600 text-[10px] font-black rounded-xl transition-all border border-orange-200 active:scale-95 uppercase">
                        danh sách
                    </button>
                </div>
            </div>
        </div>
    )}
                <div className="flex flex-col gap-3 w-full">
                    
                    {/* HÀNG 3 NÚT */}
                    <div className="flex flex-row gap-4 w-full h-12">
                        
                        {/* 1. MENU CHỌN NHANH (Quick Select) */}
    <div className="relative flex-1" ref={quickMenuRef}> 
                        <button onClick={() => toggleMenu('quick')} className={`w-full h-full px-1 border rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-[0.98] ${isMenuOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                            <span className="font-bold text-xs whitespace-nowrap">Chọn nhanh</span>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-2 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                
                             {/* --- PHẦN GỘP: BẢNG CHỮ CÁI & BỘ THỦ --- */}
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-left">Bảng chữ cái & Bộ thủ</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {/* Nút 1: Hiragana */}
                                        <button 
                                            onClick={() => handleLoadFromGithub('./data/hiragana.json', 'hiragana')} 
                                            className="py-2 text-[11px] font-bold bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-black hover:text-white transition truncate"
                                            title="Hiragana"
                                        >
                                            あ Hira
                                        </button>
    
                                        {/* Nút 2: Katakana */}
                                        <button 
                                            onClick={() => handleLoadFromGithub('./data/katakana.json', 'katakana')} 
                                            className="py-2 text-[11px] font-bold bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-black hover:text-white transition truncate"
                                            title="Katakana"
                                        >
                                            ア Kata
                                        </button>
    
                                        {/* Nút 3: Bộ thủ */}
                                        <button 
                                            onClick={() => handleLoadFromGithub('./data/bothu.json')} 
                                            className="py-2 text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-600 hover:text-white transition truncate"
                                            title="Bộ thủ cơ bản"
                                        >
                                            Bộ thủ
                                        </button>
                                    </div>
                                </div>
    
                               
                                {/* Lấy tất cả Kanji */}
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-left">Lấy tất cả Kanji</p>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
                                            <button 
                                                key={level} 
                                                onClick={() => { 
                                                    const fileName = `kanji${level.toLowerCase()}.json`; 
                                                    const url = `./data/${fileName}`; 
                                                    handleLoadFromGithub(url); 
                                                }} 
                                                className={`py-2 text-[11px] font-black border rounded-md transition-all duration-200 active:scale-95 ${levelColors[level]}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
    
                                {/* Lấy ngẫu nhiên (Đã chuyển xuống đây) */}
                                <div>
                                    <div className="flex justify-start items-center gap-2 mb-2 mt-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Lấy ngẫu nhiên</p>
                                        {/* Input số lượng */}
                                        <div className="flex items-center gap-1.5">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="50" 
                                                value={randomCount} 
                                                onChange={(e) => { 
                                                    const val = e.target.value; 
                                                    if (val === '') setRandomCount(''); 
                                                    else setRandomCount(parseInt(val)); 
                                                }} 
                                                onKeyDown={(e) => { if (e.key === 'Enter' && randomCount > 50) setRandomCount(50) }} 
                                                onBlur={() => { if (randomCount > 50) setRandomCount(50) }} 
                                                className="w-10 h-6 text-[16px] text-center font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">chữ</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
                                            <button 
                                                key={`rand-${level}`} 
                                                onClick={() => handleRandomLoadFromGithub(level)} 
                                                className={`py-2 text-[11px] font-black border rounded-md transition-all duration-200 active:scale-95 ${levelColors[level]}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
    
                       {/* 2. MENU TIỆN ÍCH (Utilities) */}
    <div className="relative flex-1" ref={utilsMenuRef}> 
                        <button onClick={() => toggleMenu('utils')} className={`w-full h-full px-1 border rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-[0.98] ${isUtilsOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                            <span className="font-bold text-xs whitespace-nowrap">Tiện ích</span>
                        </button>
                        {isUtilsOpen && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                
                                {/* Công cụ Xáo trộn */}
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-left">Công cụ</p>
                                    <button onClick={handleShuffleCurrent} className="w-full py-2.5 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                                        Xáo trộn danh sách hiện tại
                                    </button>
                                </div>
    
                                {/* Tạo Flashcard */}
                                <div className="pt-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ÔN TẬP</p>
                                        <span className="flex-1 border-b border-gray-50"></span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (!config.text) return alert("Vui lòng nhập chữ vào ô để học flashcard!");
                                            setIsFlashcardOpen(true);
                                            setIsUtilsOpen(false);
                                        }}
                                        className="w-full py-3 bg-[#4255ff] hover:bg-[#3243cc] text-white rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 group"
                                    >
                                        <span className="bg-white p-0.5 rounded flex items-center justify-center group-hover:rotate-12 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4255ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                        </span>
                                        <span className="text-xs font-black tracking-wide uppercase">Flashcard</span>
                                    </button>
                                </div>
    
                                {/* Danh sách ôn tập (Màu Cam) */}
                                <div className="pt-0 mt-1">
                                    <button 
                                        onClick={() => {
                                            onOpenReviewList();    
                                            setIsUtilsOpen(false); 
                                        }}
                                        className="w-full py-2.5 bg-orange-50 border border-orange-200 text-orange-600 hover:text-orange-700 hover:border-orange-300 hover:bg-orange-100 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 group shadow-sm"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                             className="text-orange-500 group-hover:text-orange-600 transition-colors"
                                        >
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                            <path d="M8 14h.01"></path>
                                            <path d="M12 14h.01"></path>
                                            <path d="M16 14h.01"></path>
                                            <path d="M8 18h.01"></path>
                                            <path d="M12 18h.01"></path>
                                            <path d="M16 18h.01"></path>
                                        </svg>
                                        <span className="text-xs font-bold uppercase tracking-wide">LỊCH TRÌNH ÔN TẬP</span>
                                    </button>
                                </div>
    
                            </div>
                        )}
     </div>
                        {/* 3. TÙY CHỈNH */}
                        <div className="relative flex-1" ref={configMenuRef}> 
                        <button onClick={() => toggleMenu('config')} className={`w-full h-full px-1 border rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-[0.98] ${isConfigOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                            <span className="font-bold text-xs whitespace-nowrap">Tùy chỉnh</span>
                        </button>
                        
    {isConfigOpen && (
    <div className="absolute bottom-full right-0 mb-2 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
    
        {/* MỤC 1: SỐ CHỮ MẪU */}
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-600">Số chữ mẫu</label>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">{config.traceCount} chữ</span>
            </div>
            <input type="range" min="0" max="12" step="1" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={config.traceCount} onChange={(e) => handleChange('traceCount', parseInt(e.target.value))} />
        </div>
    
        {/* MỤC 2: ĐỘ ĐẬM CHỮ */}
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-600">Độ đậm chữ</label>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">{Math.round(config.traceOpacity * 100)}%</span>
            </div>
            <input type="range" min="0.05" max="0.5" step="0.05" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={config.traceOpacity} onChange={(e) => handleChange('traceOpacity', parseFloat(e.target.value))} />
        </div>
    
        {/* MỤC 3: CỠ CHỮ */}
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-600">Cỡ chữ</label>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">{config.fontSize} pt</span>
            </div>
            <input type="range" min="30" max="40" step="1" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={config.fontSize} onChange={(e) => handleChange('fontSize', parseInt(e.target.value))} />
        </div>
    
        {/* MỤC 4: ĐỘ ĐẬM KHUNG */}
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-600">Độ đậm khung</label>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">{Math.round(config.gridOpacity * 100)}%</span>
            </div>
            <input type="range" min="0.1" max="1" step="0.1" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={config.gridOpacity} onChange={(e) => handleChange('gridOpacity', parseFloat(e.target.value))} />
        </div>
    
        {/* MỤC 5: NÚT GẠT ON/KUN (LUÔN BẬT/TẮT ĐƯỢC) */}
    <div className="pt-2 border-t border-gray-100">
    <div className="space-y-1">
        {/* Đã bỏ hasJLPT ? 'cursor-pointer' : 'cursor-not-allowed opacity-50' */}
        <label className="flex items-center justify-between group cursor-pointer">
            <span className="text-[11px] font-bold text-gray-600">Hiện âm On/Kun</span>
            <div className="relative inline-block w-9 h-5">
                <input 
                    type="checkbox" 
                    className="peer opacity-0 w-0 h-0" 
                    checked={config.showOnKun} // Chỉ phụ thuộc vào config
                    onChange={() => handleChange('showOnKun', !config.showOnKun)} // Luôn cho phép bấm
                />
                {/* Màu sắc luôn sáng rõ để người dùng biết là bấm được */}
                <span className="absolute inset-0 rounded-full transition-all duration-300 bg-gray-200 peer-checked:bg-indigo-600"></span>
                <span className={`absolute left-1 bottom-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${config.showOnKun ? 'translate-x-4' : ''}`}></span>
            </div>
        </label>
    </div>
    </div>
    
    {/* NÚT ĐẶT LẠI MẶC ĐỊNH - Đã thu gọn */}
    <div className="pt-0"> {/* Giảm padding top từ pt-1 về pt-0 */}
    <button 
        onClick={() => onChange({ ...config, fontSize: 33, traceCount: 9, traceOpacity: 0.15, gridOpacity: 0.8, showOnKun: false })} 
        className="w-full py-1.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95"
    >
        {/* Giảm size icon từ 12 xuống 10 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> 
        KHÔI PHỤC MẶC ĐỊNH
    </button>
    </div>
    
    </div>
    )}
                        </div>
                    </div>
    
    {/* --- PHẦN CUỐI CỦA SIDEBAR (CẬP NHẬT THÊM NÚT TÀI LIỆU) --- */}
        <div className="w-full mt-auto pt-4 flex flex-col gap-4"> 
        
        {/* 1. NÚT IN (ĐÃ SỬA: CHẶN KHI RỖNG) */}
        <button 
            onClick={() => {
            // --- LOGIC KIỂM TRA MỚI ---
            if (!config.text || config.text.trim().length === 0) {
                alert("Vui lòng nhập nội dung để tạo file"); 
                return; // Dừng lại, không mở modal in
            }
            setIsPrintModalOpen(true); 
            }} 
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 group"
        >
            <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg> 
            IN / LƯU PDF
        </button>
    
    {/* --- 2. NÚT XEM TRƯỚC / XEM BẢN MẪU (MÀU: XANH KHI XEM, ĐỎ KHI ĐÓNG) --- */}
    {(() => {
    // Biến kiểm tra xem có nội dung hay không
    const isEmpty = !config.text || config.text.trim().length === 0;
    
    return (
        <button 
            onClick={() => {
                if (showMobilePreview) {
                    setShowMobilePreview(false);
                } else {
                    setShowMobilePreview(true);
                    // Cuộn xuống vùng xem trước
                    setTimeout(() => {
                        const previewElement = document.getElementById('preview-area');
                        if(previewElement) previewElement.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            }}
            className={`md:hidden w-full py-3 font-bold rounded-xl border shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all mt-3 ${
                showMobilePreview 
                    ? 'bg-red-50 text-red-700 border-red-200'      // KHI ĐANG MỞ -> MÀU ĐỎ
                    : 'bg-green-50 text-green-700 border-green-200' // KHI ĐANG ĐÓNG -> MÀU XANH
            }`}
        >
            {showMobilePreview ? (
                // === TRẠNG THÁI: ĐANG MỞ (NÚT ĐỂ ĐÓNG LẠI) ===
                <>
                    {isEmpty ? (
                        // Đóng bản mẫu: Giữ nguyên icon X
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    ) : (
                        // Đóng bản in: Dùng icon CON MẮT MỞ (Eye)
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
    
                    {isEmpty ? "ĐÓNG HƯỚNG DẪN" : "ĐÓNG BẢN XEM TRƯỚC"}
                </>
            ) : (
                // === TRẠNG THÁI: ĐANG ĐÓNG (NÚT ĐỂ MỞ RA) ===
                <>
                    {isEmpty ? (
                        /* Xem bản mẫu: Giữ nguyên icon Quyển sách */
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            XEM HƯỚNG DẪN
                        </>
                    ) : (
                        /* Xem trước bản in: Dùng icon CON MẮT GẠCH CHÉO (Eye Off) */
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                            XEM TRƯỚC BẢN IN
                        </>
                    )}
                </>
            )}
        </button>
    );
    })()}
    
        {/* 2. KHU VỰC LIÊN HỆ (4 NÚT: DONATE - TIKTOK - NHÓM - TÀI LIỆU) */}
        <div className="flex items-center justify-between px-2 gap-2 text-xs font-bold text-gray-500 pb-2">
            
    {/* Nút Donate */}
            <div className="relative flex flex-col items-center" ref={cafeModalRef}>
                <button 
                    onClick={() => { setIsCafeModalOpen(!isCafeModalOpen); setIsMenuOpen(false); setIsUtilsOpen(false); setIsConfigOpen(false); setIsFilterMenuOpen(false); }} 
                    className="flex flex-col items-center gap-1 group w-full"
                >
                    {/* Icon Container: Cố định w-9 h-9 để tròn đều */}
                    <div className="p-2 bg-orange-50 rounded-full text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
                            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
                            <line x1="6" y1="2" x2="6" y2="4"/>
                            <line x1="10" y1="2" x2="10" y2="4"/>
                            <line x1="14" y1="2" x2="14" y2="4"/>
                        </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-orange-600">Mời cafe</span>
                </button>
    
                {/* Popup Cafe */}
                {isCafeModalOpen && (
                    <div className="absolute bottom-full left-0 mb-3 z-[60] w-60 bg-white border border-orange-100 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="text-center space-y-3">
                            <p className="text-[10px] text-orange-800 font-medium leading-tight">Sự ủng hộ của bạn giúp mình duy trì và phát triển nhiều tính năng mới. Cảm ơn bạn rất nhiều!</p>
                            <div className="bg-gray-50 p-2 rounded-lg inline-block shadow-inner">
                                <img src="https://i.ibb.co/JWGwcTL1/3381513652021492183.jpg" alt="QR Cafe" className="w-28 h-auto rounded"/>
                            </div>
                            <p className="text-[11px] text-orange-500 font-bold bg-orange-50 py-1 rounded">MB BANK: 99931082002</p>
                        </div>
                        {/* Mũi tên trỏ xuống của popup */}
                        <div className="absolute top-full left-4 -mt-1 w-3 h-3 bg-white border-b border-r border-orange-100 rotate-45"></div>
                    </div>
                )}
            </div>
            {/* Nút Tiktok */}
            <a href="https://www.tiktok.com/@phadaotiengnhat" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 hover:text-black transition-colors group">
                <div className="p-2 bg-gray-100 rounded-full text-gray-600 group-hover:bg-black group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                </div>
                <span className="text-[10px]">Tiktok</span>
            </a>
    
            {/* Nút Nhóm */}
            <a href="https://zalo.me/g/ujgais332" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 hover:text-blue-600 transition-colors group">
                <div className="p-2 bg-blue-50 rounded-full text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <span className="text-[10px]">Nhóm</span>
            </a>
    
            {/* --- NÚT MỚI: TÀI LIỆU --- */}
            <button 
                onClick={() => setIsDocsModalOpen(true)}
                className="flex flex-col items-center gap-1 hover:text-purple-600 transition-colors group"
            >
                <div className="p-2 bg-purple-50 rounded-full text-purple-500 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <span className="text-[10px]">Tài liệu</span>
            </button>
    
        </div>
    
        </div>
    
        {/* --- POPUP TÀI LIỆU (MỚI THÊM) --- */}
        {isDocsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 flex flex-col max-h-[80vh]">
                
                {/* Header của Popup */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
    {/* Bắt đầu Icon 2D */}
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
    {/* Kết thúc Icon 2D */}
    TÀI LIỆU HỌC TẬP
    </h3>
                    <button onClick={() => setIsDocsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
    
                {/* Danh sách tài liệu (Cuộn được nếu dài) */}
                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
                    
                    {/* 2139 kanji */}
                    <a href="https://drive.google.com/file/d/1Q3bbd3Aao7R71wemjESHddbvmXWYe542/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-purple-700 pb-1">2139 Hán tự (N5-N1)</p>
                            <p className="text-[10px] text-gray-400">PDF • 797 KB</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
    
                    {/* quy tắc chuyển âm */}
                    <a href="https://drive.google.com/file/d/17L2ufF9P0GfLrhzE_yCsAqjXYSYrhTxU/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-purple-700 pb-1">Quy tắc chuyển âm</p>
                            <p className="text-[10px] text-gray-400">PDF • 128 KB</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
    
                    {/* Flashcard Kanji */}
                    <a href="https://quizlet.com/join/mE5CzMyT7?i=4yxqkk&x=1bqt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-purple-700 pb-1">Flashcard 2139 kanji N5-N1</p>
                            <p className="text-[10px] text-gray-400">147 học phần</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
    
                    {/* Flashcard từ vựng */}
                    <a href="https://quizlet.com/join/nuE9y8xHf?i=4yxqkk&x=1bqt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-purple-700 pb-1">Flashcard từ vựng N5-N1</p>
                            <p className="text-[10px] text-gray-400">354 học phần</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
    
                    {/* nhóm học tập */}
                    <a href="https://zalo.me/g/ujgais332" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                        {/* Đã đổi: bg-blue -> bg-orange */}
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            {/* Đã đổi: Icon File -> Icon Nhóm người */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-purple-700 pb-1">Thêm nhiều tài liệu khác...</p>
                            <p className="text-[10px] text-gray-400">tham gia nhóm học tập</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
    
                </div>
    
                {/* Nút đóng màu đen */}
                <div className="p-4 pt-2 bg-white">
                    <button 
                        onClick={() => setIsDocsModalOpen(false)}
                        className="w-full py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                        ĐÓNG
                    </button>
                </div>
    
            </div>
        </div>
        )}
    
    {/* --- MODAL (POPUP) XÁC NHẬN IN --- */}
    {isPrintModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    {/* Hộp nội dung chính */}
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200 border border-gray-200">
        
        {/* 1. NÚT ĐÓNG (X) MÀU ĐỎ Ở GÓC PHẢI */}
        <button 
        onClick={() => setIsPrintModalOpen(false)}
        className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition-colors z-10 group"
        title="Đóng"
        >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    
        {/* 2. NỘI DUNG CẢNH BÁO */}
        <div className="p-6 flex flex-col items-center text-center">
        
        {/* Icon trang trí */}
        <div className="w-14 h-14 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mb-4 border border-yellow-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
    
        <h3 className="text-xl font-bold text-gray-800 mb-2">LƯU Ý QUAN TRỌNG</h3>
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800 leading-relaxed text-left w-full">
            <p className="font-bold mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Để bản in đẹp nhất:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Nên dùng <b>Máy tính (PC/Laptop)</b>.</li>
            <li>Trình duyệt khuyên dùng: <b>Google Chrome</b>.</li>
            <li>Không nên dùng <b>iphone</b>.</li>
            </ul>
        </div>
    
        {/* 3. NÚT IN THẬT SỰ (NẰM TRONG KHUNG) */}
        <button 
            onClick={() => {
            setIsPrintModalOpen(false); // Đóng khung này
            onPrint(); // Gọi lệnh in của hệ thống
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            TIẾN HÀNH IN/LƯU NGAY
        </button>
    
        </div>
    </div>
    </div>
    )}
    
                </div>
            </div>
            
            {/* GIAO DIỆN THANH LOADING (Overlay) */}
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="w-72 p-6 bg-white rounded-2xl shadow-2xl border border-indigo-50 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider animate-pulse">
                        Đang nạp dữ liệu...
                    </span>
                    <span className="text-sm font-black text-indigo-600">{progress}%</span>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                        style={{ width: `${progress}%` }}
                    ></div>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 mt-3 text-center italic">
                    Hệ thống đang xử lý, vui lòng đợi giây lát...
                    </p>
                </div>
                </div>
            )}
            
            </div>
        );
        };
    
        
        const App = () => {
    // --- Các state cũ giữ nguyên ---
    const [isCafeModalOpen, setIsCafeModalOpen] = useState(false);
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
            const [isReviewListOpen, setIsReviewListOpen] = useState(false);
            const [srsData, setSrsData] = useState(() => {
        // Tự động lấy dữ liệu cũ từ máy người dùng khi mở web
        const saved = localStorage.getItem('phadao_srs_data');
                
        return saved ? JSON.parse(saved) : {};
    });
    
    // Hàm để lưu kết quả học tập
    const updateSRSProgress = (char, quality) => {
        const newProgress = calculateSRS(srsData[char], quality);
        const newData = { ...srsData, [char]: newProgress };
        setSrsData(newData);
        localStorage.setItem('phadao_srs_data', JSON.stringify(newData));
    };
    const handleResetAllSRS = () => {
        setSrsData({}); // Xóa sạch state
        localStorage.removeItem('phadao_srs_data'); // Xóa sạch trong bộ nhớ máy
    };
    // State cấu hình mặc định
    const [config, setConfig] = useState({ 
        text: '', fontSize: 33, traceCount: 9, verticalOffset: -3, 
        traceOpacity: 0.15, guideScale: 1.02, guideX: 0, guideY: 0.5, 
        gridOpacity: 0.8, gridType: 'cross', 
        fontFamily: "'Klee One', 'UD Digi Kyokasho N-R', 'UD Digi Kyokasho', 'UD デジタル 教科書体 N-R', 'UD デジタル 教科書体', cursive",
        showOnKun: false 
    });
    
    const [showPostPrintDonate, setShowPostPrintDonate] = useState(false);
    
    // --- PHẦN MỚI: State chứa dữ liệu tải về ---
    const [dbData, setDbData] = useState(null);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    
    // 1. Dùng useEffect để tải dữ liệu ngay khi mở web
    useEffect(() => {
        fetchDataFromGithub().then(data => {
            if (data) {
                setDbData(data);      // Lưu dữ liệu vào state
                setIsDbLoaded(true); // Báo hiệu đã tải xong
            }
        });
    }, []);
    
    // 2. Logic xử lý cuộn trang khi hiện popup (giữ nguyên)
    useEffect(() => {
        if (showPostPrintDonate) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showPostPrintDonate]);
    
    /*useEffect(() => {
        if (!config.text || config.text.trim().length === 0) setShowMobilePreview(false);
    }, [config.text]); */
    // ------------------------------
    
    // 3. Logic phân trang (giữ nguyên)
    const pages = useMemo(() => {
        const contentToShow = (config.text && config.text.trim().length > 0) ? config.text : "日本語"; 
        const chars = Array.from(contentToShow).filter(c => c.trim().length > 0);
        const chunks = [];
        const ROWS_PER_PAGE = 10;
        for (let i = 0; i < chars.length; i += ROWS_PER_PAGE) { chunks.push(chars.slice(i, i + ROWS_PER_PAGE)); }
        if (chunks.length === 0) return [[]];
        return chunks;
    }, [config.text]);
    
    // 4. Logic in ấn (giữ nguyên)
    const handlePrint = () => {
        const handleAfterPrint = () => { setShowPostPrintDonate(true); window.removeEventListener("afterprint", handleAfterPrint); };
        window.addEventListener("afterprint", handleAfterPrint);
        window.print();
    };
    
    // --- MÀN HÌNH CHỜ (LOADING) ---
    // Nếu dữ liệu chưa tải xong, hiện màn hình xoay vòng tròn
    if (!isDbLoaded) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold animate-pulse">Đang tải dữ liệu Kanji...</p>
            </div>
        );
    }
    
    // --- GIAO DIỆN CHÍNH (Khi đã có dữ liệu) ---
    return (
        <div className="min-h-screen flex flex-col md:flex-row print-layout-reset">
        <div className="no-print z-50">
        <Sidebar 
            config={config} onChange={setConfig} onPrint={handlePrint} 
            isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen}
            isConfigOpen={isConfigOpen} setIsConfigOpen={setIsConfigOpen}
            isCafeModalOpen={isCafeModalOpen} setIsCafeModalOpen={setIsCafeModalOpen} 
            showMobilePreview={showMobilePreview} setShowMobilePreview={setShowMobilePreview}
            setIsFlashcardOpen={setIsFlashcardOpen}
            
            dbData={dbData} // <--- QUAN TRỌNG: Truyền dữ liệu xuống Sidebar
                srsData={srsData}
             onOpenReviewList={() => setIsReviewListOpen(true)}
          
        />
        </div>
    
        <div id="preview-area" className={`flex-1 bg-gray-100 p-0 md:p-8 overflow-auto flex-col items-center min-h-screen print-layout-reset custom-scrollbar ${showMobilePreview ? 'flex' : 'hidden md:flex'}`}>
        {pages.map((pageChars, index) => (
            <Page 
            key={index} 
            chars={pageChars} 
            config={config} 
            
            dbData={dbData} // <--- QUAN TRỌNG: Truyền dữ liệu xuống page 
            /> 
        ))}
        </div>
    
        {/* Popup Donate  */}
        {showPostPrintDonate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-in zoom-in-95 duration-300 border border-orange-100">
            <button onClick={() => setShowPostPrintDonate(false)} className="absolute top-3 right-3 p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-500 rounded-full transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="p-6 flex flex-col items-center text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">BẠN TẠO ĐƯỢC FILE CHƯA?</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">Nếu bạn thấy trang web hữu ích <br/> hãy mời mình một ly cafe nhé!</p>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-xl shadow-inner border border-orange-200 mb-4">
                <img src="https://i.ibb.co/JWGwcTL1/3381513652021492183.jpg" alt="QR Donate" className="w-40 h-auto rounded-lg mix-blend-multiply" />
                </div>
                <p className="text-[11px] font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full mb-4">MB BANK: 99931082002</p>
                <button onClick={() => setShowPostPrintDonate(false)} className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95">Lần sau nhé!</button>
            </div>
            </div>
        </div>
        )}
            
    <FlashcardModal 
        isOpen={isFlashcardOpen} 
        onClose={() => setIsFlashcardOpen(false)} 
        text={config.text} 
        dbData={dbData} 
        onSrsUpdate={updateSRSProgress}
        srsData={srsData} 
        onSrsRestore={(char, oldData) => {
            // Hàm này sẽ đè dữ liệu cũ (snapshot) lên dữ liệu hiện tại
            const newData = { ...srsData, [char]: oldData };
            setSrsData(newData);
            localStorage.setItem('phadao_srs_data', JSON.stringify(newData));
        }}
    />
           {/* 3. RENDER MODAL MỚI */}
                <ReviewListModal 
                    isOpen={isReviewListOpen}
                    onClose={() => setIsReviewListOpen(false)}
                    srsData={srsData}
                    onResetSRS={handleResetAllSRS}
                />
            </div>
    );
    };
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    