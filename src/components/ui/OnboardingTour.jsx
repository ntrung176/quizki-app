import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, Settings, Plus, Trash2, ArrowUp, ArrowDown, Copy, Download, Upload } from 'lucide-react';
import { auth } from '../../config/firebase';

const ONBOARDING_KEY = 'quizki-onboarding-done-v3';
const CUSTOM_STEPS_KEY = 'quizki-custom-tour-steps-v3';

// Check / mark helpers (export for settings reset)
const hasSeenOnboarding = (section) => {
    try {
        const seen = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
        return !!seen[section];
    } catch { return false; }
};

const markOnboardingSeen = (section) => {
    try {
        const seen = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
        seen[section] = true;
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(seen));
    } catch { }
};

const resetAllOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(CUSTOM_STEPS_KEY);
};

// ==================== Tour steps targeting sidebar data-tour-id ====================
const TOUR_STEPS = [
    // --- HOME SECTION ---
    {
        target: '[data-tour-id="HOME"]',
        title: '🏠 Trang chủ',
        desc: 'Xem tổng quan tiến độ học tập, thống kê, số ngày học liên tục (streak) và các hoạt động học tập gần đây.',
        section: 'home'
    },
    {
        target: '[data-tour-id="VOCAB_LIST"]',
        title: '📖 Học Từ Vựng',
        desc: 'Quản lý các học phần cá nhân, thêm từ vựng mới, ôn tập SRS và theo dõi tiến trình học từ vựng theo sách giáo khoa.',
        section: 'home'
    },
    {
        target: '[data-tour-id="KANJI_STUDY"]',
        title: '🈶 Thư viện Kanji',
        desc: 'Học Kanji theo cấp độ JLPT từ N5 đến N1, tự động ghi nhớ và ôn tập thông qua hệ thống SRS thông minh.',
        section: 'home'
    },
    {
        target: '[data-tour-id="GRAMMAR"]',
        title: '📝 Học Ngữ Pháp',
        desc: 'Học các cấu trúc ngữ pháp chi tiết theo cấp độ JLPT kèm câu ví dụ cụ thể.',
        section: 'home'
    },
    {
        target: '[data-tour-id="JLPT_TEST"]',
        title: '🏁 Luyện Đề JLPT',
        desc: 'Tham gia các bài thi mô phỏng JLPT đầy đủ các phần với giới hạn thời gian thực tế.',
        section: 'home'
    },
    {
        target: '[data-tour-id="SETTINGS"]',
        title: '⚙️ Trang cá nhân & Cài đặt',
        desc: 'Chỉnh sửa thông tin tài khoản, bật/tắt nhạc nền, âm thanh hiệu ứng và đổi giao diện sáng/tối.',
        section: 'home'
    },
    {
        target: '[data-tour-id="HELP_BTN"]',
        title: '💡 Xem lại Hướng dẫn',
        desc: 'Click vào đây bất cứ lúc nào để xem lại hướng dẫn sử dụng cho màn hình hiện tại.',
        section: 'home'
    },

    // --- VOCAB REVIEW SECTION ---
    {
        target: '[data-tour-id="FLASHCARD_CONTAINER"]',
        title: '🎴 Thẻ Ghi Nhớ (Flashcard)',
        desc: 'Mặt trước hiển thị từ tiếng Nhật. Nhấn trực tiếp vào thẻ hoặc phím Space để lật sang mặt sau xem nghĩa tiếng Việt, Furigana và câu ví dụ.',
        section: 'vocabReview'
    },
    {
        target: '[data-tour-id="FLASHCARD_SPEAKER"]',
        title: '🔊 Nghe phát âm',
        desc: 'Nhấn vào biểu tượng loa để nghe giọng đọc bản xứ phát âm từ vựng này một cách chuẩn xác.',
        section: 'vocabReview'
    },
    {
        target: '[data-tour-id="RATING_PANEL"]',
        title: '📊 Đánh giá mức độ nhớ',
        desc: 'Sau khi lật thẻ, hãy tự chọn: Quên rồi (Again), Khó (Hard), Tốt (Good), hoặc Dễ (Easy). Hệ thống SRS sẽ tự động xếp lịch ôn tập tối ưu cho bạn.',
        section: 'vocabReview'
    },

    // --- VOCAB ADD SECTION ---
    {
        target: '[data-tour-id="STUDY_SET_TITLE"]',
        title: '✏️ Tiêu đề học phần',
        desc: 'Đặt tên cho học phần từ vựng mới của bạn (ví dụ: Từ vựng N3 - Bài 1) trước khi tiến hành lưu.',
        section: 'vocabAdd'
    },
    {
        target: '[data-tour-id="AI_BATCH_BTN"]',
        title: '🤖 Tạo hàng loạt bằng AI',
        desc: 'Nhập danh sách từ vựng dạng văn bản thô, AI sẽ tự động phân tích và tạo toàn bộ thẻ từ vựng cho bạn cực kỳ nhanh chóng.',
        section: 'vocabAdd'
    },
    {
        target: '[data-tour-id="SAVE_SET_BTN"]',
        title: '💾 Lưu học phần',
        desc: 'Sau khi nhập đầy đủ từ vựng và tiêu đề, bấm nút này để tạo và lưu học phần vào kho của bạn.',
        section: 'vocabAdd'
    }
];

const MOBILE_TOUR_STEPS = [
    // --- HOME SECTION ---
    {
        target: '',
        title: '🏠 Trang chủ',
        desc: 'Theo dõi tiến độ học tập, số ngày học liên tục (streak) và các hoạt động học tập gần đây của bạn.',
        section: 'home'
    },
    {
        target: '',
        title: '📖 Học Từ Vựng',
        desc: 'Quản lý học phần cá nhân, thêm từ vựng mới, ôn tập SRS và theo dõi tiến trình học từ vựng.',
        section: 'home'
    },
    {
        target: '',
        title: '🈶 Thư viện Kanji',
        desc: 'Học và ghi nhớ Kanji từ N5 đến N1 thông qua hệ thống lặp lại ngắt quãng thông minh.',
        section: 'home'
    },
    {
        target: '',
        title: '📝 Học Ngữ Pháp',
        desc: 'Học các cấu trúc ngữ pháp chi tiết theo cấp độ JLPT kèm câu ví dụ cụ thể.',
        section: 'home'
    },
    {
        target: '',
        title: '🏁 Luyện Đề JLPT',
        desc: 'Tham gia thi thử JLPT đầy đủ các phần trực tiếp ngay trên điện thoại với thời gian thực.',
        section: 'home'
    },
    {
        target: '',
        title: '⚙️ Cài đặt cá nhân',
        desc: 'Chỉnh sửa tài khoản, tùy chọn nhạc nền, âm thanh hiệu ứng và đổi giao diện sáng/tối.',
        section: 'home'
    },

    // --- VOCAB REVIEW SECTION ---
    {
        target: '',
        title: '🎴 Ôn tập Thẻ Ghi Nhớ',
        desc: 'Nhấn trực tiếp vào thẻ để lật mặt sau xem nghĩa tiếng Việt, Furigana và ví dụ minh họa.',
        section: 'vocabReview'
    },
    {
        target: '',
        title: '🔊 Nghe phát âm',
        desc: 'Nhấn vào biểu tượng loa để nghe giọng phát âm bản xứ chuẩn xác của từ vựng.',
        section: 'vocabReview'
    },
    {
        target: '',
        title: '📊 Đánh giá mức độ nhớ',
        desc: 'Chọn Quên rồi (Again), Khó (Hard), Tốt (Good), hoặc Dễ (Easy) sau khi lật thẻ để hệ thống SRS lên lịch ôn tập tối ưu.',
        section: 'vocabReview'
    },

    // --- VOCAB ADD SECTION ---
    {
        target: '',
        title: '✏️ Tiêu đề học phần',
        desc: 'Đặt tên cho học phần từ vựng mới của bạn trước khi tiến hành lưu.',
        section: 'vocabAdd'
    },
    {
        target: '',
        title: '🤖 Tạo hàng loạt bằng AI',
        desc: 'Nhập danh sách từ vựng dạng văn bản thô, AI sẽ tự động phân tích và tạo toàn bộ thẻ từ vựng nhanh chóng.',
        section: 'vocabAdd'
    },
    {
        target: '',
        title: '💾 Lưu học phần',
        desc: 'Bấm nút Lưu học phần để tạo và lưu các thẻ từ vựng vào kho của bạn.',
        section: 'vocabAdd'
    }
];


const escapeId = (id) => {
    if (typeof CSS !== 'undefined' && CSS.escape) {
        return CSS.escape(id);
    }
    return id.replace(/(:|\.|\[|\]|,|=|@)/g, '\\$1');
};

const getUniqueSelector = (el) => {
    if (!(el instanceof Element)) return '';
    
    // 1. If the element itself has data-tour-id, use it!
    if (el.getAttribute('data-tour-id')) {
        return `[data-tour-id="${el.getAttribute('data-tour-id')}"]`;
    }
    
    // 2. If the element itself has a unique ID, use it!
    if (el.id && document.querySelectorAll(`#${escapeId(el.id)}`).length === 1) {
        return `#${escapeId(el.id)}`;
    }
    
    const path = [];
    let current = el;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        // Stop traversing if we hit an element with data-tour-id or a unique ID
        if (current.getAttribute('data-tour-id')) {
            path.unshift(`[data-tour-id="${current.getAttribute('data-tour-id')}"]`);
            break;
        }
        if (current.id && document.querySelectorAll(`#${escapeId(current.id)}`).length === 1) {
            path.unshift(`#${escapeId(current.id)}`);
            break;
        }
        
        let tagName = current.tagName.toLowerCase();
        
        // Find index among siblings of same tag name
        let index = 1;
        let sibling = current.previousSibling;
        while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName.toLowerCase() === tagName) {
                index++;
            }
            sibling = sibling.previousSibling;
        }
        
        const siblings = current.parentNode ? Array.from(current.parentNode.children).filter(c => c.tagName.toLowerCase() === tagName) : [];
        if (siblings.length > 1) {
            path.unshift(`${tagName}:nth-of-type(${index})`);
        } else {
            path.unshift(tagName);
        }
        
        current = current.parentNode;
    }
    
    return path.join(' > ');
};

// ==================== Main Component ====================
const OnboardingTour = ({ userId: propUserId, isAdmin: propIsAdmin, section = 'home', forceTrigger = 0 }) => {
    // Loaded Custom Steps or Default steps
    const [steps, setSteps] = useState(() => {
        try {
            const saved = localStorage.getItem(CUSTOM_STEPS_KEY);
            return saved ? JSON.parse(saved) : TOUR_STEPS;
        } catch {
            return TOUR_STEPS;
        }
    });

    const [userId, setUserId] = useState(propUserId || null);
    const [userEmail, setUserEmail] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Resolve user and admin privileges automatically
    useEffect(() => {
        if (propUserId) {
            setUserId(propUserId);
            setAuthLoading(false);
            return;
        }
        const unsub = auth.onAuthStateChanged(user => {
            if (user) {
                setUserId(user.uid);
                setUserEmail(user.email);
            } else {
                setUserId(null);
                setUserEmail(null);
            }
            setAuthLoading(false);
        });
        return () => unsub();
    }, [propUserId]);

    const resolvedIsAdmin = propIsAdmin || (userEmail && userEmail === import.meta.env.VITE_ADMIN_EMAIL);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter steps for the active section (e.g. 'home', 'vocabReview', etc.)
    const activeSteps = useMemo(() => {
        const baseSteps = isMobile ? MOBILE_TOUR_STEPS : steps;
        return baseSteps.filter(item => item.section === section);
    }, [steps, section, isMobile]);

    const [isActive, setIsActive] = useState(false);
    const [step, setStep] = useState(0);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [highlightRect, setHighlightRect] = useState(null);
    const tooltipRef = useRef(null);

    // Builder Mode states
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [hoveredSelector, setHoveredSelector] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    
    // Form fields
    const [newStepTarget, setNewStepTarget] = useState('');
    const [newStepTitle, setNewStepTitle] = useState('');
    const [newStepDesc, setNewStepDesc] = useState('');
    const [newStepSection, setNewStepSection] = useState(section);
    const [editingIndex, setEditingIndex] = useState(null);

    // Export / Import states
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');



    const lastTriggerRef = useRef(forceTrigger);

    // Reset tour state and align trigger ref when section changes
    useEffect(() => {
        setIsActive(false);
        setStep(0);
        lastTriggerRef.current = forceTrigger;
    }, [section]);

    // Force trigger tour when restart button is clicked (only when forceTrigger increments)
    useEffect(() => {
        if (forceTrigger > lastTriggerRef.current) {
            if (activeSteps.length > 0) {
                setIsActive(prev => !prev);
                setStep(0);
            }
            lastTriggerRef.current = forceTrigger;
        }
    }, [forceTrigger, activeSteps.length]);

    // Refs to compare coordinates and avoid redundant state updates / loops
    const lastPosRef = useRef({ top: 0, left: 0 });
    const lastRectRef = useRef(null);

    // Position tooltip near target
    const reposition = useCallback(() => {
        if (isMobile) {
            if (lastRectRef.current !== null) {
                lastRectRef.current = null;
                setHighlightRect(null);
            }
            return;
        }

        if (!isActive || step >= activeSteps.length) {
            if (lastRectRef.current !== null) {
                lastRectRef.current = null;
                setHighlightRect(null);
            }
            return;
        }
        const el = document.querySelector(activeSteps[step].target);
        if (!el) {
            if (lastRectRef.current !== null) {
                lastRectRef.current = null;
                setHighlightRect(null);
            }
            return;
        }

        const rect = el.getBoundingClientRect();
        const newRect = {
            top: rect.top - 3, left: rect.left - 3,
            width: rect.width + 6, height: rect.height + 6,
        };

        const tt = tooltipRef.current;
        const ttH = tt?.offsetHeight || 180;
        const ttW = tt?.offsetWidth || 340;

        // Default: right side of the target
        let top = rect.top + rect.height / 2 - ttH / 2;
        let left = rect.right + 14;

        // Clamp vertical
        if (top + ttH > window.innerHeight - 16) top = window.innerHeight - ttH - 16;
        if (top < 16) top = 16;

        // If off-screen right → position below
        if (left + ttW > window.innerWidth - 16) {
            left = Math.max(16, rect.left);
            top = rect.bottom + 12;
        }

        // Compare with last values to avoid redundant state updates
        const rectChanged = !lastRectRef.current ||
            Math.abs(lastRectRef.current.top - newRect.top) > 0.5 ||
            Math.abs(lastRectRef.current.left - newRect.left) > 0.5 ||
            Math.abs(lastRectRef.current.width - newRect.width) > 0.5 ||
            Math.abs(lastRectRef.current.height - newRect.height) > 0.5;

        const posChanged = Math.abs(lastPosRef.current.top - top) > 0.5 ||
            Math.abs(lastPosRef.current.left - left) > 0.5;

        if (rectChanged) {
            lastRectRef.current = newRect;
            setHighlightRect(newRect);
        }
        if (posChanged) {
            lastPosRef.current = { top, left };
            setPos({ top, left });
        }
    }, [isActive, step, activeSteps, isMobile]);

    useEffect(() => {
        reposition();
        if (isMobile) return;

        const id = requestAnimationFrame(reposition);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [reposition, isMobile]);

    const finish = useCallback(() => {
        setIsActive(false);
        if (userId) markOnboardingSeen(`tour-v3-${section}-${userId}`);
    }, [userId, section]);

    const next = () => step < activeSteps.length - 1 ? setStep(s => s + 1) : finish();
    const prev = () => step > 0 && setStep(s => s - 1);

    // Save Steps list to localStorage
    const saveSteps = (newSteps) => {
        setSteps(newSteps);
        try {
            localStorage.setItem(CUSTOM_STEPS_KEY, JSON.stringify(newSteps));
        } catch (e) {
            console.error("Lỗi lưu bước tùy chỉnh:", e);
        }
    };

    // Selection Mode event handlers
    useEffect(() => {
        if (!isSelecting) return;

        const handleMouseOver = (e) => {
            if (e.target.closest('.tour-builder-ui')) return;
            e.preventDefault();
            e.stopPropagation();

            const el = e.target;
            el.style.outline = '3px dashed #6366f1';
            el.style.outlineOffset = '2px';

            let selector = getUniqueSelector(el);
            setHoveredSelector(selector);
        };

        const handleMouseOut = (e) => {
            if (e.target.closest('.tour-builder-ui')) return;
            const el = e.target;
            el.style.outline = '';
            el.style.outlineOffset = '';
        };

        const handleMouseClick = (e) => {
            if (e.target.closest('.tour-builder-ui')) return;
            e.preventDefault();
            e.stopPropagation();

            const el = e.target;
            el.style.outline = '';

            let selector = getUniqueSelector(el);

            setNewStepTarget(selector);
            setNewStepTitle('');
            setNewStepDesc('');
            setNewStepSection(section);
            setEditingIndex(null);
            setIsSelecting(false);
            setShowFormModal(true);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsSelecting(false);
                setHoveredSelector('');
            }
        };

        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('mouseout', handleMouseOut, true);
        document.addEventListener('click', handleMouseClick, true);
        window.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver, true);
            document.removeEventListener('mouseout', handleMouseOut, true);
            document.removeEventListener('click', handleMouseClick, true);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isSelecting, section]);

    const handleSaveNewStep = () => {
        if (!newStepTarget.trim() || !newStepTitle.trim() || !newStepDesc.trim() || !newStepSection.trim()) return;
        const newStepObj = {
            target: newStepTarget.trim(),
            title: newStepTitle.trim(),
            desc: newStepDesc.trim(),
            section: newStepSection.trim()
        };

        let updated;
        if (editingIndex !== null) {
            const activeItem = activeSteps[editingIndex];
            const globalIdx = steps.findIndex(item => item === activeItem);
            if (globalIdx !== -1) {
                updated = [...steps];
                updated[globalIdx] = newStepObj;
                saveSteps(updated);
            }
        } else {
            updated = [...steps, newStepObj];
            saveSteps(updated);
        }

        setShowFormModal(false);
        setEditingIndex(null);
        
        // Calculate new index in activeSteps
        const newActiveSteps = updated.filter(item => item.section === section);
        setIsActive(true);
        if (editingIndex !== null) {
            setStep(editingIndex);
        } else {
            // Find active index of the newly added item if it belongs to the current section
            if (newStepSection === section) {
                setStep(newActiveSteps.length - 1);
            }
        }
    };

    const deleteStep = (activeIdx) => {
        const activeItem = activeSteps[activeIdx];
        const updated = steps.filter(item => item !== activeItem);
        saveSteps(updated);
        
        const newActiveSteps = updated.filter(item => item.section === section);
        if (step >= newActiveSteps.length) {
            setStep(Math.max(0, newActiveSteps.length - 1));
        }
    };

    const moveStepUp = (activeIdx) => {
        if (activeIdx === 0) return;
        const activeItem = activeSteps[activeIdx];
        const prevItem = activeSteps[activeIdx - 1];
        
        const globalIdx = steps.findIndex(item => item === activeItem);
        const prevGlobalIdx = steps.findIndex(item => item === prevItem);
        
        if (globalIdx !== -1 && prevGlobalIdx !== -1) {
            const updated = [...steps];
            updated[globalIdx] = prevItem;
            updated[prevGlobalIdx] = activeItem;
            saveSteps(updated);
            setStep(activeIdx - 1);
        }
    };

    const moveStepDown = (activeIdx) => {
        if (activeIdx === activeSteps.length - 1) return;
        const activeItem = activeSteps[activeIdx];
        const nextItem = activeSteps[activeIdx + 1];
        
        const globalIdx = steps.findIndex(item => item === activeItem);
        const nextGlobalIdx = steps.findIndex(item => item === nextItem);
        
        if (globalIdx !== -1 && nextGlobalIdx !== -1) {
            const updated = [...steps];
            updated[globalIdx] = nextItem;
            updated[nextGlobalIdx] = activeItem;
            saveSteps(updated);
            setStep(activeIdx + 1);
        }
    };

    const handleEditStep = (activeIdx) => {
        const activeItem = activeSteps[activeIdx];
        setNewStepTarget(activeItem.target);
        setNewStepTitle(activeItem.title);
        setNewStepDesc(activeItem.desc);
        setNewStepSection(activeItem.section || section);
        setEditingIndex(activeIdx);
        setShowFormModal(true);
    };

    const handleImportJSON = () => {
        try {
            const parsed = JSON.parse(importText);
            if (Array.isArray(parsed)) {
                // Ensure all steps have section field
                const normalized = parsed.map(item => ({
                    ...item,
                    section: item.section || 'home'
                }));
                saveSteps(normalized);
                setShowImportModal(false);
                setStep(0);
                setIsActive(true);
            } else {
                alert('Mã JSON phải là một mảng các bước!');
            }
        } catch (e) {
            alert('Lỗi định dạng JSON: ' + e.message);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Đã sao chép vào bộ nhớ tạm!');
    };

    const resetToDefault = () => {
        if (window.confirm('Bạn có chắc chắn muốn khôi phục về các bước mặc định?')) {
            saveSteps(TOUR_STEPS);
            setStep(0);
        }
    };

    const previewCurrentStep = activeSteps[step];

    return (
        <>

            {/* Tour Overlay highlight and Box */}
            {isActive && activeSteps.length > 0 && previewCurrentStep && (
                <>
                    {/* Dark backdrop overlay on mobile */}
                    {isMobile && (
                        <div
                            className="fixed inset-0 bg-black/60 z-[10000] backdrop-blur-xs animate-fade-in"
                            onClick={finish}
                        />
                    )}

                    {!isMobile && highlightRect && (
                        <div
                            className="fixed rounded-xl pointer-events-none transition-all duration-300 ease-out"
                            style={{
                                ...highlightRect,
                                zIndex: 10000,
                                boxShadow: '0 0 0 3px rgba(99,102,241,0.7), 0 0 16px 4px rgba(99,102,241,0.25)',
                            }}
                        />
                    )}

                    <div
                        ref={isMobile ? null : tooltipRef}
                        className={isMobile
                            ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-[10001] animate-fade-in text-left"
                            : "fixed w-80 z-[10001] animate-fade-in"
                        }
                        style={isMobile ? {} : { top: pos.top, left: pos.left }}
                    >
                        <div className="bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl shadow-black/40 border border-slate-600/40 overflow-hidden">
                            {!isMobile && highlightRect && pos.left > (highlightRect.left + highlightRect.width) && (
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2" style={{ zIndex: 1 }}>
                                    <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-transparent border-r-slate-800/95 dark:border-r-slate-900/95" />
                                </div>
                            )}

                            <div className="p-5 pb-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15px] font-bold text-white leading-tight">{previewCurrentStep.title}</h3>
                                        <p className="text-[13px] text-slate-300 mt-1.5 leading-relaxed">{previewCurrentStep.desc}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 pb-4 pt-1 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    {activeSteps.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setStep(i)}
                                            className={`h-2 rounded-full transition-all duration-200 ${i === step ? 'bg-indigo-500 w-5' :
                                                i < step ? 'bg-indigo-400/50 w-2' : 'bg-slate-600 w-2'}`}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={finish}
                                        className="text-[11px] text-slate-400 hover:text-white transition-colors px-2 py-1"
                                    >
                                        Bỏ qua
                                    </button>
                                    {step > 0 && (
                                        <button
                                            onClick={prev}
                                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={next}
                                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-600/30"
                                    >
                                        {step === activeSteps.length - 1 ? (
                                            <>Hoàn thành <Sparkles className="w-3.5 h-3.5" /></>
                                        ) : (
                                            <>Tiếp theo <ChevronRight className="w-3.5 h-3.5" /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Admin Builder Toggle & Panel */}
            {resolvedIsAdmin && !isMobile && (
                <div className="tour-builder-ui text-left">
                    {/* Floating Design Button */}
                    <button
                        onClick={() => setIsBuilderOpen(!isBuilderOpen)}
                        className="fixed bottom-4 right-4 z-[10002] flex items-center gap-2 px-4.5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-2xl transition-all scale-100 hover:scale-105"
                    >
                        <Settings className="w-4 h-4 animate-spin-slow" />
                        <span>Thiết kế Tour ({section})</span>
                    </button>

                    {/* Editor Panel Side Drawer */}
                    {isBuilderOpen && (
                        <div className="fixed top-0 right-0 w-96 h-screen z-[10003] bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl border-l border-slate-800 text-white shadow-2xl flex flex-col animate-slide-in">
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-indigo-500" />
                                        <h3 className="font-extrabold text-base tracking-tight">Trình Tạo Hướng Dẫn</h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Screen: {section}</span>
                                </div>
                                <button
                                    onClick={() => setIsBuilderOpen(false)}
                                    className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Steps List */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">CÁC BƯỚC MÀN HÌNH ({activeSteps.length})</span>
                                    {activeSteps.length > 0 && (
                                        <button
                                            onClick={() => setIsActive(!isActive)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                                isActive ? 'bg-emerald-500/25 border border-emerald-500 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-slate-400'
                                            }`}
                                        >
                                            {isActive ? 'Ẩn xem trước' : 'Bật xem trước'}
                                        </button>
                                    )}
                                </div>

                                {activeSteps.length === 0 ? (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl p-5 space-y-2">
                                        <p className="text-sm text-slate-450 font-medium">Chưa có hướng dẫn nào cho màn hình này.</p>
                                        <p className="text-xs text-slate-500">Nhấp vào nút dưới để bắt đầu chọn các phần tử trên trang này.</p>
                                    </div>
                                ) : (
                                    activeSteps.map((stepItem, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setIsActive(true);
                                                setStep(idx);
                                            }}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                step === idx && isActive
                                                    ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10 shadow-lg'
                                                    : 'bg-slate-850/50 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-indigo-400">Bước {idx + 1}</span>
                                                    <h4 className="text-sm font-bold text-white truncate mt-0.5">{stepItem.title}</h4>
                                                    <p className="text-xs font-mono text-slate-450 truncate mt-1 bg-slate-900/60 p-1 rounded select-all">{stepItem.target}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveStepUp(idx); }}
                                                        disabled={idx === 0}
                                                        className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        title="Di chuyển lên"
                                                    >
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveStepDown(idx); }}
                                                        disabled={idx === activeSteps.length - 1}
                                                        className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        title="Di chuyển xuống"
                                                    >
                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditStep(idx); }}
                                                        className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white"
                                                        title="Sửa nội dung"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteStep(idx); }}
                                                        className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-red-400"
                                                        title="Xóa bước"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Actions panel */}
                            <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-3">
                                {isSelecting ? (
                                    <button
                                        onClick={() => setIsSelecting(false)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors shadow-lg shadow-rose-600/20 animate-pulse"
                                    >
                                        <X className="w-4 h-4" />
                                        Đang chọn... (Hủy/Esc)
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsSelecting(true)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Chọn phần tử trên trang
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setShowExportModal(true)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700/50"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Xuất JSON
                                    </button>
                                    <button
                                        onClick={() => {
                                            setImportText('');
                                            setShowImportModal(true);
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700/50"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        Nhập JSON
                                    </button>
                                </div>
                                <button
                                    onClick={resetToDefault}
                                    className="w-full text-center text-xs text-slate-500 hover:text-red-400 transition-colors py-1.5"
                                >
                                    Khôi phục các bước mặc định
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step Editor Modal Dialog */}
                    {showFormModal && (
                        <div className="fixed inset-0 z-[20005] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 tour-builder-modal animate-fade-in">
                            <div className="w-full max-w-md bg-slate-850 dark:bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <h3 className="font-extrabold text-lg text-white">
                                        {editingIndex !== null ? `Sửa Bước ${editingIndex + 1}` : 'Thêm Bước Mới'}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowFormModal(false);
                                            setEditingIndex(null);
                                        }}
                                        className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bộ chọn phần tử (Target Selector)</label>
                                        <input
                                            type="text"
                                            value={newStepTarget}
                                            onChange={(e) => setNewStepTarget(e.target.value)}
                                            placeholder="CSS Selector như [data-tour-id='HOME']"
                                            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Màn hình / Menu (Section)</label>
                                        <input
                                            type="text"
                                            value={newStepSection}
                                            onChange={(e) => setNewStepSection(e.target.value)}
                                            placeholder="Tên màn hình..."
                                            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none rounded-xl px-4 py-2.5 text-sm text-indigo-300 font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tiêu đề bước (Title)</label>
                                        <input
                                            type="text"
                                            value={newStepTitle}
                                            onChange={(e) => setNewStepTitle(e.target.value)}
                                            placeholder="Nhập tiêu đề..."
                                            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none rounded-xl px-4 py-2.5 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mô tả hướng dẫn (Description)</label>
                                        <textarea
                                            value={newStepDesc}
                                            onChange={(e) => setNewStepDesc(e.target.value)}
                                            placeholder="Giải thích tính năng hoặc hướng dẫn sử dụng..."
                                            rows={3.5}
                                            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none rounded-xl px-4 py-2.5 text-sm text-white resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowFormModal(false);
                                            setEditingIndex(null);
                                        }}
                                        className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-400 bg-slate-800 hover:bg-slate-750 transition-colors border border-slate-700/50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveNewStep}
                                        disabled={!newStepTarget.trim() || !newStepTitle.trim() || !newStepDesc.trim() || !newStepSection.trim()}
                                        className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                    >
                                        Xác nhận
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Export Code Modal Dialog */}
                    {showExportModal && (
                        <div className="fixed inset-0 z-[20005] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 tour-builder-modal animate-fade-in">
                            <div className="w-full max-w-lg bg-slate-850 dark:bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <h3 className="font-extrabold text-lg text-white">Xuất mã JSON</h3>
                                    <button
                                        onClick={() => setShowExportModal(false)}
                                        className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs text-slate-400">Sao chép đoạn mã JSON bên dưới và dán thay thế vào biến <code className="font-mono text-indigo-400">TOUR_STEPS</code> ở dòng 28 của file <code className="font-mono text-slate-300">OnboardingTour.jsx</code>.</p>
                                    <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-indigo-300 max-h-80 overflow-y-auto select-all leading-relaxed whitespace-pre-wrap">
                                        {JSON.stringify(steps, null, 4)}
                                    </pre>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(JSON.stringify(steps, null, 4))}
                                        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Sao chép mã
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowExportModal(false)}
                                        className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-450 bg-slate-800 hover:bg-slate-750 transition-colors border border-slate-700/50"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import Code Modal Dialog */}
                    {showImportModal && (
                        <div className="fixed inset-0 z-[20005] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 tour-builder-modal animate-fade-in">
                            <div className="w-full max-w-lg bg-slate-850 dark:bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <h3 className="font-extrabold text-lg text-white">Nhập cấu hình JSON</h3>
                                    <button
                                        onClick={() => setShowImportModal(false)}
                                        className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs text-slate-400">Dán đoạn mã cấu hình JSON của mảng các bước (TOUR_STEPS) mà bạn đã lưu vào ô bên dưới:</p>
                                    <textarea
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder={`[\n    {\n        "target": "[data-tour-id=\\"HOME\\"]",\n        "title": "Trang chủ",\n        "desc": "...",\n        "section": "home"\n    }\n]`}
                                        rows={8}
                                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none rounded-xl px-4 py-3 text-xs font-mono text-white leading-relaxed"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowImportModal(false)}
                                        className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-455 bg-slate-800 hover:bg-slate-750 transition-colors border border-slate-700/50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleImportJSON}
                                        disabled={!importText.trim()}
                                        className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                    >
                                        Nhập dữ liệu
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Inline animation styles */}
            <style>{`
                .animate-fade-in {
                    animation: tourFadeIn 0.22s ease-out;
                }
                .animate-slide-in {
                    animation: tourSlideIn 0.26s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .animate-spin-slow {
                    animation: spin 6s linear infinite;
                }
                @keyframes tourFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes tourSlideIn {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
                .bg-slate-850 {
                    background-color: rgb(30, 41, 59);
                }
                .text-slate-450 {
                    color: rgb(148, 163, 184);
                }
                .text-slate-455 {
                    color: rgb(156, 163, 175);
                }
            `}</style>
        </>
    );
};

export default OnboardingTour;
