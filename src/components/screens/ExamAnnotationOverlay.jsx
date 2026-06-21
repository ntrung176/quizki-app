import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    MousePointer, 
    Pencil, 
    Highlighter, 
    Eraser, 
    Type, 
    Minus,
    StickyNote, 
    Trash2, 
    X, 
    Check, 
    GripVertical, 
    ChevronDown,
    ChevronUp,
    Palette,
    HelpCircle
} from 'lucide-react';

// Custom SVG icon representing a curved line
const CurveIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19C3 19 8 5 12 5C16 5 21 19 21 19" />
    </svg>
);

// Custom SVG icon representing text line highlighting
const TextHighlightIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h10M4 18h14" />
        <path d="M14 14l4 4 5-5" strokeWidth="2.5" stroke="currentColor" />
    </svg>
);

const COLORS = {
    pen: [
        { name: 'Đỏ', value: '#ef4444' },
        { name: 'Xanh dương', value: '#3b82f6' },
        { name: 'Xanh lá', value: '#10b981' },
        { name: 'Đen/Trắng', value: 'dynamic' }
    ],
    highlighter: [
        { name: 'Vàng', value: '#fef08a' },
        { name: 'Xanh lá', value: '#bbf7d0' },
        { name: 'Hồng', value: '#fbcfe8' }
    ]
};

// CSS Highlight styles injection
const HIGHLIGHT_CSS = `
  ::highlight(hl-yellow) { background-color: rgba(253, 224, 71, 0.42) !important; color: inherit !important; }
  ::highlight(hl-green) { background-color: rgba(134, 239, 172, 0.42) !important; color: inherit !important; }
  ::highlight(hl-pink) { background-color: rgba(244, 143, 177, 0.42) !important; color: inherit !important; }
`;

// Range Offset Helpers for stable Serialization
const getRangeOffsets = (range, container) => {
    let startOffset = 0;
    let endOffset = 0;
    let foundStart = false;
    let foundEnd = false;

    const iterator = document.createNodeIterator(container, NodeFilter.SHOW_TEXT);
    let node;
    while (node = iterator.nextNode()) {
        if (node === range.startContainer) {
            startOffset += range.startOffset;
            foundStart = true;
        } else if (!foundStart) {
            startOffset += node.textContent.length;
        }

        if (node === range.endContainer) {
            endOffset += range.endOffset;
            foundEnd = true;
            break;
        } else if (!foundEnd) {
            endOffset += node.textContent.length;
        }
    }
    return foundStart && foundEnd ? { startOffset, endOffset } : null;
};

const restoreRange = (offsets, container) => {
    const range = document.createRange();
    const iterator = document.createNodeIterator(container, NodeFilter.SHOW_TEXT);
    let node;
    let currentOffset = 0;
    let startNode = null;
    let startOffsetInNode = 0;
    let endNode = null;
    let endOffsetInNode = 0;

    while (node = iterator.nextNode()) {
        const len = node.textContent.length;
        if (!startNode && currentOffset + len >= offsets.startOffset) {
            startNode = node;
            startOffsetInNode = offsets.startOffset - currentOffset;
        }
        if (!endNode && currentOffset + len >= offsets.endOffset) {
            endNode = node;
            endOffsetInNode = offsets.endOffset - currentOffset;
            break;
        }
        currentOffset += len;
    }

    if (startNode && endNode) {
        range.setStart(startNode, startOffsetInNode);
        range.setEnd(endNode, endOffsetInNode);
        return range;
    }
    return null;
};

const ExamAnnotationOverlay = ({ 
    testId, 
    sectionIdx, 
    questionIdx, 
    isEnabled,
    readOnly = false
}) => {
    const shouldRender = isEnabled || readOnly;
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const toolbarRef = useRef(null);

    // --- Toolbar State ---
    const [activeTool, setActiveTool] = useState('cursor'); // 'cursor' | 'pen' | 'line' | 'curve' | 'highlighter' | 'text-highlighter' | 'eraser' | 'text' | 'sticky'
    const [penColor, setPenColor] = useState('#ef4444');
    const [highlighterColor, setHighlighterColor] = useState('#fef08a');
    
    // Position coordinates relative to viewport
    const [toolbarPos, setToolbarPos] = useState({ x: null, y: 120 }); 
    const [isToolbarDragging, setIsToolbarDragging] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // --- Annotation Data State ---
    const questionKey = `${testId}_s${sectionIdx}_q${questionIdx}`;
    const [strokes, setStrokes] = useState([]);
    const [textObjects, setTextObjects] = useState([]);
    const [stickyNotes, setStickyNotes] = useState([]);
    const [selectionHighlights, setSelectionHighlights] = useState([]); // Array of { id, startOffset, endOffset, color }

    // --- Drawing State ---
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [curveState, setCurveState] = useState(null); // null or { step: 0, start: {x,y}, current: {x,y} } or { step: 1, start: {x,y}, end: {x,y}, control: {x,y} }
    
    // --- Text Tool State ---
    const [editingTextId, setEditingTextId] = useState(null);
    const [textInputPos, setTextInputPos] = useState(null);
    const [textInputValue, setTextInputValue] = useState('');
    const [editingTextProps, setEditingTextProps] = useState(null); // { width, fontSize }

    // --- Dragging & Resizing Notes/Texts State ---
    const [draggedItem, setDraggedItem] = useState(null); 
    const [resizedItem, setResizedItem] = useState(null); 

    // --- Canvas Dimensions & Scaling Reference ---
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [refSize, setRefSize] = useState({ width: 768, height: 800 });
    const [penThickness, setPenThickness] = useState(3.5);

    const ratio = (canvasSize.width && refSize.width) ? (canvasSize.width / refSize.width) : 1;

    const getCurrentToRefCoords = (coords) => ({
        x: coords.x / ratio,
        y: coords.y / ratio
    });

    // Detect dark mode
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    const getResolvedPenColor = () => {
        if (penColor === 'dynamic') {
            return isDarkMode() ? '#f3f4f6' : '#1f2937';
        }
        return penColor;
    };

    // --- Load & Save Data ---
    useEffect(() => {
        if (!testId) return;
        const savedData = localStorage.getItem(`quizki_annotations_${questionKey}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setStrokes(parsed.strokes || []);
                setTextObjects(parsed.textObjects || []);
                setStickyNotes(parsed.stickyNotes || []);
                setSelectionHighlights(parsed.selectionHighlights || []);
                
                const rWidth = parsed.refWidth || parsed.canvasWidth || 768;
                const rHeight = parsed.refHeight || parsed.canvasHeight || 800;
                setRefSize({ width: rWidth, height: rHeight });
            } catch (e) {
                console.error("Error loading annotations:", e);
            }
        } else {
            setStrokes([]);
            setTextObjects([]);
            setStickyNotes([]);
            setSelectionHighlights([]);
            setRefSize({ width: canvasSize.width || 768, height: canvasSize.height || 800 });
        }
        setIsDrawing(false);
        setCurrentPoints([]);
        setCurveState(null);
        setEditingTextId(null);
        setTextInputPos(null);
    }, [questionKey, testId]);

    const saveAnnotations = (updatedStrokes, updatedTexts, updatedStickies, updatedSelections = selectionHighlights) => {
        if (!testId) return;
        const dataToSave = {
            strokes: updatedStrokes,
            textObjects: updatedTexts,
            stickyNotes: updatedStickies,
            selectionHighlights: updatedSelections,
            refWidth: refSize.width,
            refHeight: refSize.height
        };
        if (updatedStrokes.length === 0 && updatedTexts.length === 0 && updatedStickies.length === 0 && updatedSelections.length === 0) {
            localStorage.removeItem(`quizki_annotations_${questionKey}`);
        } else {
            localStorage.setItem(`quizki_annotations_${questionKey}`, JSON.stringify(dataToSave));
        }
    };

    // --- Dynamic Text Highlight Rendering via CSS Custom Highlights API ---
    useEffect(() => {
        if (!shouldRender) return;
        
        if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') {
            return;
        }

        // Clear existing highlights
        CSS.highlights.delete('hl-yellow');
        CSS.highlights.delete('hl-green');
        CSS.highlights.delete('hl-pink');

        if (selectionHighlights.length === 0) return;

        const container = document.getElementById('jlpt-question-content-wrapper');
        if (!container) return;

        const yellowRanges = [];
        const greenRanges = [];
        const pinkRanges = [];

        selectionHighlights.forEach(hl => {
            const range = restoreRange(hl, container);
            if (range) {
                if (hl.color === '#fef08a') yellowRanges.push(range);
                else if (hl.color === '#bbf7d0') greenRanges.push(range);
                else if (hl.color === '#fbcfe8') pinkRanges.push(range);
            }
        });

        if (yellowRanges.length > 0) CSS.highlights.set('hl-yellow', new Highlight(...yellowRanges));
        if (greenRanges.length > 0) CSS.highlights.set('hl-green', new Highlight(...greenRanges));
        if (pinkRanges.length > 0) CSS.highlights.set('hl-pink', new Highlight(...pinkRanges));
    }, [selectionHighlights, shouldRender, questionKey]);

    // --- Text Selection Highlight Handler ---
    useEffect(() => {
        if (!isEnabled || activeTool !== 'text-highlighter') return;

        const handleSelectionMouseUp = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            const container = document.getElementById('jlpt-question-content-wrapper');
            if (!container || !container.contains(range.commonAncestorContainer)) return;

            const offsets = getRangeOffsets(range, container);
            if (offsets) {
                const newHighlight = {
                    id: `hl_${Date.now()}`,
                    startOffset: offsets.startOffset,
                    endOffset: offsets.endOffset,
                    color: highlighterColor
                };
                
                // Clear blue default browser selection
                selection.removeAllRanges();

                const updated = [...selectionHighlights, newHighlight];
                setSelectionHighlights(updated);
                saveAnnotations(strokes, textObjects, stickyNotes, updated);
            }
        };

        const container = document.getElementById('jlpt-question-content-wrapper');
        if (container) {
            container.addEventListener('pointerup', handleSelectionMouseUp);
        }
        return () => {
            if (container) {
                container.removeEventListener('pointerup', handleSelectionMouseUp);
            }
        };
    }, [isEnabled, activeTool, highlighterColor, selectionHighlights, strokes, textObjects, stickyNotes]);

    // --- Eraser for Text Selection Highlights ---
    const handleTextEraserAction = (clientX, clientY) => {
        const container = document.getElementById('jlpt-question-content-wrapper');
        if (!container) return;

        let caretRange = null;
        if (document.caretRangeFromPoint) {
            caretRange = document.caretRangeFromPoint(clientX, clientY);
        } else if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(clientX, clientY);
            if (pos) {
                caretRange = document.createRange();
                caretRange.setStart(pos.offsetNode, pos.offset);
                caretRange.collapse(true);
            }
        }

        if (!caretRange || !container.contains(caretRange.startContainer)) return;

        const offsets = getRangeOffsets(caretRange, container);
        if (offsets) {
            const clickedOffset = offsets.startOffset;
            let hit = false;
            const filtered = selectionHighlights.filter(hl => {
                const isInside = clickedOffset >= hl.startOffset && clickedOffset <= hl.endOffset;
                if (isInside) hit = true;
                return !isInside;
            });

            if (hit) {
                setSelectionHighlights(filtered);
                saveAnnotations(strokes, textObjects, stickyNotes, filtered);
            }
        }
    };

    // --- Eraser specifically for Highlights (freehand and text) ---
    const handleHighlightEraserAction = (point) => {
        let hit = false;
        const newStrokes = strokes.filter(stroke => {
            if (stroke.type !== 'highlighter') return true;
            const isIntersecting = checkIntersection(point, stroke);
            if (isIntersecting) hit = true;
            return !isIntersecting;
        });

        if (hit) {
            setStrokes(newStrokes);
            saveAnnotations(newStrokes, textObjects, stickyNotes, selectionHighlights);
        }
    };

    const clearAllHighlights = () => {
        const remainingStrokes = strokes.filter(s => s.type !== 'highlighter');
        setStrokes(remainingStrokes);
        setSelectionHighlights([]);
        saveAnnotations(remainingStrokes, textObjects, stickyNotes, []);
    };

    // --- Canvas Sizing (covers full scroll container height) ---
    const updateSize = useCallback(() => {
        const parent = overlayRef.current?.parentElement || document.getElementById('jlpt-main-scroll-container');
        if (parent) {
            const width = parent.scrollWidth || parent.clientWidth || parent.offsetWidth;
            const height = parent.scrollHeight || parent.clientHeight || parent.offsetHeight;
            
            if (width > 0 && height > 0) {
                setCanvasSize({ width, height });
                setRefSize(prev => {
                    if (prev.width === 768 && prev.height === 800) {
                        return { width, height };
                    }
                    return prev;
                });
            } else {
                let retries = 0;
                const check = () => {
                    const w = parent.scrollWidth || parent.clientWidth;
                    const h = parent.scrollHeight || parent.clientHeight;
                    if (w > 0 && h > 0) {
                        setCanvasSize({ width: w, height: h });
                        setRefSize(prev => {
                            if (prev.width === 768 && prev.height === 800) {
                                return { width: w, height: h };
                            }
                            return prev;
                        });
                    } else if (retries < 5) {
                        retries++;
                        setTimeout(check, 50 * retries);
                    }
                };
                setTimeout(check, 50);
            }
        }
    }, []);

    useEffect(() => {
        if (!shouldRender) return;
        
        updateSize();
        const initialTimer = setTimeout(updateSize, 100);

        const parent = overlayRef.current?.parentElement || document.getElementById('jlpt-main-scroll-container');
        if (!parent) return () => clearTimeout(initialTimer);

        const observer = new ResizeObserver(() => {
            updateSize();
        });
        observer.observe(parent);

        window.addEventListener('resize', updateSize);

        return () => {
            clearTimeout(initialTimer);
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, [updateSize, questionKey, shouldRender]);

    // Redraw on change
    useEffect(() => {
        if (!shouldRender) return;
        drawCanvas();
    }, [canvasSize, strokes, currentPoints, curveState, activeTool, penColor, highlighterColor, shouldRender, ratio, penThickness]);

    // --- Drawing Maths Helpers ---
    const getDistance = (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

    const distToSegment = (p, a, b) => {
        const A = p.x - a.x;
        const B = p.y - a.y;
        const C = b.x - a.x;
        const D = b.y - a.y;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = a.x;
            yy = a.y;
        } else if (param > 1) {
            xx = b.x;
            yy = b.y;
        } else {
            xx = a.x + param * C;
            yy = b.y + param * D;
        }

        const dx = p.x - xx;
        const dy = p.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getBezierPoint = (t, p0, p1, p2) => {
        const mt = 1 - t;
        return {
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
        };
    };

    const checkIntersection = (eraserPoint, stroke) => {
        const threshold = 14 + (stroke.width / 2);

        if (stroke.type === 'pen' || stroke.type === 'highlighter') {
            return stroke.points.some(pt => getDistance(eraserPoint, pt) < threshold);
        } else if (stroke.type === 'line') {
            if (stroke.points.length >= 2) {
                return distToSegment(eraserPoint, stroke.points[0], stroke.points[1]) < threshold;
            }
        } else if (stroke.type === 'curve') {
            if (stroke.points.length >= 3) {
                for (let i = 0; i <= 20; i++) {
                    const t = i / 20;
                    const pt = getBezierPoint(t, stroke.points[0], stroke.points[1], stroke.points[2]);
                    if (getDistance(eraserPoint, pt) < threshold) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const handleEraserAction = (point, clientX, clientY) => {
        const refPoint = getCurrentToRefCoords(point);
        let strokesHit = false;
        const newStrokes = strokes.filter(stroke => {
            const isIntersecting = checkIntersection(refPoint, stroke);
            if (isIntersecting) strokesHit = true;
            return !isIntersecting;
        });

        let textsHit = false;
        const newTexts = textObjects.filter(textObj => {
            const fs = textObj.fontSize || 14;
            const w = textObj.width || 150;
            const lineCount = Math.max(1, Math.ceil((textObj.text.length * (fs * 0.6)) / w));
            const estimatedHeight = lineCount * (fs * 1.3);
            
            const isInside = refPoint.x >= textObj.x - 12 && 
                             refPoint.x <= textObj.x + w + 12 && 
                             refPoint.y >= textObj.y - 12 && 
                             refPoint.y <= textObj.y + estimatedHeight + 12;
            
            if (isInside) textsHit = true;
            return !isInside;
        });

        if (strokesHit || textsHit) {
            if (strokesHit) setStrokes(newStrokes);
            if (textsHit) setTextObjects(newTexts);
            saveAnnotations(
                strokesHit ? newStrokes : strokes, 
                textsHit ? newTexts : textObjects, 
                stickyNotes, 
                selectionHighlights
            );
        }

        if (clientX !== undefined && clientY !== undefined) {
            handleTextEraserAction(clientX, clientY);
        }
    };

    // --- Drawing Render ---
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw saved strokes
        strokes.forEach(stroke => {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width * ratio;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (stroke.type === 'highlighter') {
                ctx.globalAlpha = 0.45;
            } else {
                ctx.globalAlpha = 1.0;
            }

            if (stroke.type === 'pen' || stroke.type === 'highlighter') {
                if (stroke.points.length > 0) {
                    ctx.moveTo(stroke.points[0].x * ratio, stroke.points[0].y * ratio);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i].x * ratio, stroke.points[i].y * ratio);
                    }
                    ctx.stroke();
                }
            } else if (stroke.type === 'line') {
                if (stroke.points.length >= 2) {
                    ctx.moveTo(stroke.points[0].x * ratio, stroke.points[0].y * ratio);
                    ctx.lineTo(stroke.points[1].x * ratio, stroke.points[1].y * ratio);
                    ctx.stroke();
                }
            } else if (stroke.type === 'curve') {
                if (stroke.points.length >= 3) {
                    ctx.moveTo(stroke.points[0].x * ratio, stroke.points[0].y * ratio);
                    ctx.quadraticCurveTo(stroke.points[1].x * ratio, stroke.points[1].y * ratio, stroke.points[2].x * ratio, stroke.points[2].y * ratio);
                    ctx.stroke();
                }
            }
        });

        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw current preview
        if (isDrawing && currentPoints.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = activeTool === 'highlighter' ? highlighterColor : getResolvedPenColor();
            ctx.lineWidth = activeTool === 'highlighter' ? 18 : penThickness;
            
            if (activeTool === 'highlighter') {
                ctx.globalAlpha = 0.45;
            }

            if (activeTool === 'pen' || activeTool === 'highlighter') {
                ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
                for (let i = 1; i < currentPoints.length; i++) {
                    ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
                }
                ctx.stroke();
            } else if (activeTool === 'line') {
                ctx.lineWidth = penThickness;
                if (currentPoints.length >= 2) {
                    ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
                    ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
                    ctx.stroke();
                }
            }
        }

        // Draw curve helper previews
        if (curveState && activeTool === 'curve') {
            ctx.beginPath();
            ctx.strokeStyle = getResolvedPenColor();
            ctx.lineWidth = 3.5;

            if (curveState.step === 0) {
                ctx.moveTo(curveState.start.x, curveState.start.y);
                ctx.lineTo(curveState.current.x, curveState.current.y);
                ctx.stroke();
            } else if (curveState.step === 1) {
                ctx.moveTo(curveState.start.x, curveState.start.y);
                ctx.quadraticCurveTo(curveState.control.x, curveState.control.y, curveState.end.x, curveState.end.y);
                ctx.stroke();

                // Draw helper dot
                ctx.beginPath();
                ctx.arc(curveState.control.x, curveState.control.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1.0;
    };

    // --- Coordinates ---
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handlePointerDown = (e) => {
        if (activeTool === 'cursor' || activeTool === 'text-highlighter') return;
        
        const coords = getCanvasCoords(e);

        if (activeTool === 'eraser') {
            setIsDrawing(true);
            handleEraserAction(coords, e.clientX, e.clientY);
            return;
        }

        if (activeTool === 'text') {
            const clickedOnText = e.target.closest('.text-annotation-box');
            if (!clickedOnText) {
                setTextInputValue('');
                setTextInputPos(coords);
                setEditingTextId(null);
                setTimeout(() => document.getElementById('canvas-inline-text-input')?.focus(), 50);
            }
            return;
        }

        if (activeTool === 'sticky') {
            const newNote = {
                id: `sticky_${Date.now()}`,
                text: '',
                x: (coords.x - 20) / ratio,
                y: (coords.y - 20) / ratio,
                width: 190,
                height: 150,
                color: '#fef08a'
            };
            const updated = [...stickyNotes, newNote];
            setStickyNotes(updated);
            saveAnnotations(strokes, textObjects, updated, selectionHighlights);
            setActiveTool('cursor');
            return;
        }

        if (activeTool === 'curve') {
            if (!curveState) {
                setCurveState({
                    step: 0,
                    start: coords,
                    current: coords
                });
            } else if (curveState.step === 1) {
                const newStroke = {
                    id: `stroke_${Date.now()}`,
                    type: 'curve',
                    points: [
                        getCurrentToRefCoords(curveState.start),
                        getCurrentToRefCoords(curveState.control),
                        getCurrentToRefCoords(curveState.end)
                    ],
                    color: getResolvedPenColor(),
                    width: penThickness
                };
                const updated = [...strokes, newStroke];
                setStrokes(updated);
                saveAnnotations(updated, textObjects, stickyNotes, selectionHighlights);
                setCurveState(null);
            }
            return;
        }

        // Pen, Highlighter, Line
        setIsDrawing(true);
        setCurrentPoints([coords]);
    };

    const handlePointerMove = (e) => {
        if (!isDrawing && !curveState) return;

        const coords = getCanvasCoords(e);

        if (activeTool === 'eraser' && isDrawing) {
            handleEraserAction(coords, e.clientX, e.clientY);
            return;
        }

        if (curveState && activeTool === 'curve') {
            if (curveState.step === 0) {
                setCurveState(prev => ({ ...prev, current: coords }));
            } else if (curveState.step === 1) {
                setCurveState(prev => ({ ...prev, control: coords }));
            }
            return;
        }

        if (isDrawing) {
            if (activeTool === 'pen' || activeTool === 'highlighter') {
                setCurrentPoints(prev => [...prev, coords]);
            } else if (activeTool === 'line') {
                setCurrentPoints([currentPoints[0], coords]);
            }
        }
    };

    const handlePointerUp = (e) => {
        if (!isDrawing && !curveState) return;
        setIsDrawing(false);

        const coords = getCanvasCoords(e);

        if (activeTool === 'eraser') return;

        if (activeTool === 'curve' && curveState && curveState.step === 0) {
            const controlPoint = {
                x: (curveState.start.x + coords.x) / 2,
                y: (curveState.start.y + coords.y) / 2
            };
            setCurveState({
                step: 1,
                start: curveState.start,
                end: coords,
                control: controlPoint
            });
            return;
        }

        if (currentPoints.length > 0) {
            let pointsToSave = [...currentPoints];
            if (activeTool === 'line') {
                pointsToSave = [currentPoints[0], coords];
            }

            const newStroke = {
                id: `stroke_${Date.now()}`,
                type: activeTool,
                points: pointsToSave.map(getCurrentToRefCoords),
                color: activeTool === 'highlighter' ? highlighterColor : getResolvedPenColor(),
                width: activeTool === 'highlighter' ? 18 : penThickness
            };

            const updated = [...strokes, newStroke];
            setStrokes(updated);
            saveAnnotations(updated, textObjects, stickyNotes, selectionHighlights);
        }

        setCurrentPoints([]);
    };

    // --- Inline Text Actions ---
    const saveInlineText = () => {
        if (textInputValue.trim() === '') {
            setTextInputPos(null);
            setEditingTextProps(null);
            return;
        }

        const newText = {
            id: `text_${Date.now()}`,
            text: textInputValue,
            x: textInputPos.x / ratio,
            y: textInputPos.y / ratio,
            width: (editingTextProps ? editingTextProps.width : 150) / ratio,
            fontSize: (editingTextProps ? editingTextProps.fontSize : 14) / ratio,
            color: getResolvedPenColor()
        };

        const updated = [...textObjects, newText];
        setTextObjects(updated);
        saveAnnotations(strokes, updated, stickyNotes, selectionHighlights);
        setTextInputPos(null);
        setTextInputValue('');
        setEditingTextProps(null);
    };

    const handleTextEditStart = (textObj, e) => {
        e.stopPropagation();
        setEditingTextId(textObj.id);
        setTextInputValue(textObj.text);
        setTextInputPos({ x: textObj.x * ratio, y: textObj.y * ratio });
        setEditingTextProps({ width: (textObj.width || 150) * ratio, fontSize: (textObj.fontSize || 14) * ratio });
        
        const filtered = textObjects.filter(t => t.id !== textObj.id);
        setTextObjects(filtered);

        setTimeout(() => {
            const textarea = document.getElementById('canvas-inline-text-input');
            if (textarea) {
                textarea.focus();
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        }, 50);
    };

    // --- Drag/Resize Note Handlers ---
    const handleDragStart = (type, id, e) => {
        e.stopPropagation();
        const item = type === 'sticky' ? stickyNotes.find(n => n.id === id) : textObjects.find(t => t.id === id);
        if (!item) return;

        setDraggedItem({
            type,
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: item.x,
            initialY: item.y
        });
    };

    const handleResizeStart = (id, e) => {
        e.stopPropagation();
        e.preventDefault();
        const note = stickyNotes.find(n => n.id === id);
        if (!note) return;

        setResizedItem({
            type: 'sticky',
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialWidth: note.width || 190,
            initialHeight: note.height || 150
        });
    };

    const handleTextResizeStart = (id, mode, e) => {
        e.stopPropagation();
        e.preventDefault();
        const textObj = textObjects.find(t => t.id === id);
        if (!textObj) return;

        setResizedItem({
            type: 'text',
            mode,
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialWidth: textObj.width || 150,
            initialFontSize: textObj.fontSize || 14
        });
    };

    useEffect(() => {
        const handleGlobalPointerMove = (e) => {
            if (draggedItem) {
                const dx = (e.clientX - draggedItem.startX) / ratio;
                const dy = (e.clientY - draggedItem.startY) / ratio;
                const newX = Math.max(0, draggedItem.initialX + dx);
                const newY = Math.max(0, draggedItem.initialY + dy);

                if (draggedItem.type === 'sticky') {
                    const updated = stickyNotes.map(n => 
                        n.id === draggedItem.id ? { ...n, x: newX, y: newY } : n
                    );
                    setStickyNotes(updated);
                } else {
                    const updated = textObjects.map(t => 
                        t.id === draggedItem.id ? { ...t, x: newX, y: newY } : t
                    );
                    setTextObjects(updated);
                }
            }

            if (resizedItem) {
                const dx = (e.clientX - resizedItem.startX) / ratio;
                const dy = (e.clientY - resizedItem.startY) / ratio;

                if (resizedItem.type === 'text') {
                    const newWidth = Math.max(50, resizedItem.initialWidth + dx);
                    let newFontSize = resizedItem.initialFontSize;
                    if (resizedItem.mode === 'diagonal') {
                        newFontSize = Math.max(10, Math.min(72, resizedItem.initialFontSize + dy * 0.25));
                    }
                    const updated = textObjects.map(t => 
                        t.id === resizedItem.id ? { ...t, width: newWidth, fontSize: newFontSize } : t
                    );
                    setTextObjects(updated);
                } else {
                    const newWidth = Math.max(120, resizedItem.initialWidth + dx);
                    const newHeight = Math.max(80, resizedItem.initialHeight + dy);

                    const updated = stickyNotes.map(n => 
                        n.id === resizedItem.id ? { ...n, width: newWidth, height: newHeight } : n
                    );
                    setStickyNotes(updated);
                }
            }
        };

        const handleGlobalPointerUp = () => {
            if (draggedItem || resizedItem) {
                saveAnnotations(strokes, textObjects, stickyNotes, selectionHighlights);
                setDraggedItem(null);
                setResizedItem(null);
            }
        };

        if (draggedItem || resizedItem) {
            document.addEventListener('pointermove', handleGlobalPointerMove);
            document.addEventListener('pointerup', handleGlobalPointerUp);
        }

        return () => {
            document.removeEventListener('pointermove', handleGlobalPointerMove);
            document.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [draggedItem, resizedItem, stickyNotes, textObjects, strokes, selectionHighlights, ratio]);

    const handleStickyTextChange = (id, val) => {
        const updated = stickyNotes.map(n => 
            n.id === id ? { ...n, text: val } : n
        );
        setStickyNotes(updated);
        saveAnnotations(strokes, textObjects, updated, selectionHighlights);
    };

    const handleStickyColorToggle = (id, e) => {
        e.stopPropagation();
        const note = stickyNotes.find(n => n.id === id);
        if (!note) return;

        const noteColors = ['#fef08a', '#bfdbfe', '#bbf7d0', '#fbcfe8'];
        const currIdx = noteColors.indexOf(note.color);
        const nextColor = noteColors[(currIdx + 1) % noteColors.length];

        const updated = stickyNotes.map(n => 
            n.id === id ? { ...n, color: nextColor } : n
        );
        setStickyNotes(updated);
        saveAnnotations(strokes, textObjects, updated, selectionHighlights);
    };

    const deleteSticky = (id, e) => {
        e.stopPropagation();
        const updated = stickyNotes.filter(n => n.id !== id);
        setStickyNotes(updated);
        saveAnnotations(strokes, textObjects, updated, selectionHighlights);
    };

    const deleteText = (id, e) => {
        e.stopPropagation();
        const updated = textObjects.filter(t => t.id !== id);
        setTextObjects(updated);
        saveAnnotations(strokes, updated, stickyNotes, selectionHighlights);
    };

    const clearAllAnnotations = async () => {
        const ok = await window.showConfirm("Bạn có chắc chắn muốn xóa tất cả nháp và ghi chú vẽ trực tiếp trên câu hỏi này?", { type: 'danger' });
        if (ok) {
            setStrokes([]);
            setTextObjects([]);
            setStickyNotes([]);
            setSelectionHighlights([]);
            saveAnnotations([], [], [], []);
            setCurveState(null);
            setTextInputPos(null);
        }
    };

    // --- Toolbar Draggability ---
    const handleToolbarDragStart = (e) => {
        e.stopPropagation();
        setIsToolbarDragging(true);
        const rect = toolbarRef.current.getBoundingClientRect();
        toolbarRef.current.dataset.dragOffsetX = e.clientX - rect.left;
        toolbarRef.current.dataset.dragOffsetY = e.clientY - rect.top;
    };

    useEffect(() => {
        const handleToolbarDragMove = (e) => {
            if (!isToolbarDragging) return;
            const offsetX = parseFloat(toolbarRef.current.dataset.dragOffsetX || 0);
            const offsetY = parseFloat(toolbarRef.current.dataset.dragOffsetY || 0);

            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            newX = Math.max(10, Math.min(window.innerWidth - 75, newX));
            newY = Math.max(10, Math.min(window.innerHeight - 350, newY));

            setToolbarPos({ x: newX, y: newY });
        };

        const handleToolbarDragEnd = () => {
            setIsToolbarDragging(false);
        };

        if (isToolbarDragging) {
            document.addEventListener('pointermove', handleToolbarDragMove);
            document.addEventListener('pointerup', handleToolbarDragEnd);
        }

        return () => {
            document.removeEventListener('pointermove', handleToolbarDragMove);
            document.removeEventListener('pointerup', handleToolbarDragEnd);
        };
    }, [isToolbarDragging]);

    // --- Render Options Flyout Drawer next to the floating toolbar ---
    const renderOptionsDrawer = () => {
        const hasOptions = ['pen', 'line', 'curve', 'highlighter', 'text-highlighter'].includes(activeTool);
        if (!hasOptions || isCollapsed) return null;

        return (
            <div 
                className="fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 transition-all duration-200 select-none text-left"
                style={{ 
                    right: toolbarPos.x !== null ? 'auto' : '82px',
                    left: toolbarPos.x !== null ? `${toolbarPos.x - 170}px` : 'auto', 
                    top: `${toolbarPos.y + 40}px`,
                    width: '150px',
                    pointerEvents: 'auto'
                }}
            >
                {/* Pen color selector */}
                {activeTool === 'pen' && (
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">Màu bút</span>
                        <div className="flex gap-1.5 justify-around mt-0.5">
                            {COLORS.pen.map((col) => {
                                const resolvedVal = col.value === 'dynamic' ? (isDarkMode() ? '#ffffff' : '#1f2937') : col.value;
                                const isSelected = penColor === col.value;
                                return (
                                    <button
                                        key={col.name}
                                        onClick={() => setPenColor(col.value)}
                                        className={`w-6 h-6 rounded-full border border-black/10 transition hover:scale-110 flex items-center justify-center cursor-pointer ${
                                            isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'opacity-80'
                                        }`}
                                        style={{ backgroundColor: resolvedVal }}
                                        title={col.name}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white mix-blend-difference" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Line & Curve Selector */}
                {(activeTool === 'line' || activeTool === 'curve') && (
                    <div className="flex flex-col gap-2">
                        <span className="text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">Loại nét vẽ</span>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => { setActiveTool('line'); setCurveState(null); }}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                                    activeTool === 'line' 
                                        ? 'bg-indigo-50 text-indigo-655 dark:bg-indigo-950/40 dark:text-indigo-400' 
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <Minus className="w-3.5 h-3.5 rotate-45" /> Đường thẳng
                            </button>
                            <button
                                onClick={() => { setActiveTool('curve'); setCurveState(null); }}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                                    activeTool === 'curve' 
                                        ? 'bg-indigo-50 text-indigo-655 dark:bg-indigo-950/40 dark:text-indigo-400' 
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <CurveIcon className="w-3.5 h-3.5" /> Đường cong
                            </button>
                        </div>
                    </div>
                )}

                {/* Highlighter Type & Color Selector */}
                {(activeTool === 'text-highlighter' || activeTool === 'highlighter') && (
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">Cách highlight</span>
                        <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-850 pb-2">
                            <button
                                onClick={() => setActiveTool('text-highlighter')}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                                    activeTool === 'text-highlighter' 
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' 
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <TextHighlightIcon className="w-3.5 h-3.5 text-amber-500" /> Quét chọn chữ
                            </button>
                            <button
                                onClick={() => setActiveTool('highlighter')}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                                    activeTool === 'highlighter' 
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' 
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <Highlighter className="w-3.5 h-3.5 text-amber-555" /> Vẽ tự do
                            </button>
                        </div>

                        <span className="text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">Màu highlight</span>
                        <div className="flex gap-1.5 justify-around mt-0.5 pb-2 border-b border-slate-100 dark:border-slate-850">
                            {COLORS.highlighter.map((col) => {
                                const isSelected = highlighterColor === col.value;
                                return (
                                    <button
                                        key={col.name}
                                        onClick={() => {
                                            setHighlighterColor(col.value);
                                        }}
                                        className={`w-6 h-6 rounded-full border border-black/10 transition hover:scale-110 flex items-center justify-center cursor-pointer ${
                                            isSelected ? 'ring-2 ring-indigo-550 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'opacity-85'
                                        }`}
                                        style={{ backgroundColor: col.value }}
                                        title={col.name}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-0.5">
                            <button
                                onClick={clearAllHighlights}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition cursor-pointer"
                                title="Xoá toàn bộ highlight của câu này"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Xoá tất cả
                            </button>
                        </div>
                    </div>
                )}

                {/* Pen thickness selector */}
                {['pen', 'line', 'curve'].includes(activeTool) && (
                    <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/85 pt-2.5 mt-1.5">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cỡ ngòi bút</span>
                            <span className="text-[10px] text-slate-500 font-bold dark:text-slate-400">{penThickness}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="1.5" 
                            max="12" 
                            step="0.5"
                            value={penThickness} 
                            onChange={(e) => setPenThickness(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-1 px-1">
                            {[2, 3.5, 6, 10].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setPenThickness(size)}
                                    className={`text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border transition cursor-pointer ${
                                        penThickness === size
                                            ? 'bg-indigo-55 border-indigo-300 text-indigo-600 dark:bg-indigo-950/45 dark:border-indigo-800 dark:text-indigo-400 font-black'
                                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-305'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!shouldRender) return null;

    return (
        <div 
            ref={overlayRef} 
            className="absolute inset-0 z-20 overflow-visible pointer-events-none"
            style={{ 
                width: '100%', 
                height: `${canvasSize.height}px`
            }}
        >
            <style dangerouslySetInnerHTML={{ __html: HIGHLIGHT_CSS }} />

            {/* Drawing Canvas */}
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute inset-0 w-full h-full"
                style={{ 
                    cursor: readOnly ? 'default' : ((activeTool === 'cursor' || activeTool === 'text-highlighter') ? 'default' : 
                            activeTool === 'eraser' ? 'cell' : 
                            activeTool === 'text' ? 'text' : 'crosshair'),
                    pointerEvents: readOnly ? 'none' : ((activeTool === 'cursor' || activeTool === 'text-highlighter') ? 'none' : 'auto')
                }}
                onPointerDown={readOnly ? undefined : handlePointerDown}
                onPointerMove={readOnly ? undefined : handlePointerMove}
                onPointerUp={readOnly ? undefined : handlePointerUp}
            />

            {/* Sticky Notes */}
            {stickyNotes.map((note) => (
                <div
                    key={note.id}
                    className="absolute z-30 flex flex-col rounded-xl border shadow-lg overflow-hidden group select-none"
                    style={{
                        left: `${note.x * ratio}px`,
                        top: `${note.y * ratio}px`,
                        width: `${(note.width || 190) * ratio}px`,
                        height: `${(note.height || 150) * ratio}px`,
                        backgroundColor: note.color,
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        pointerEvents: readOnly ? 'none' : 'auto'
                    }}
                >
                    {!readOnly && (
                        <div 
                            onPointerDown={(e) => handleDragStart('sticky', note.id, e)}
                            className="h-6 flex items-center justify-between px-2 cursor-move select-none"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}
                        >
                            <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                            
                            <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleStickyColorToggle(note.id, e)}
                                    className="w-3.5 h-3.5 rounded-full border border-black/10 flex items-center justify-center bg-white hover:scale-110 cursor-pointer"
                                    title="Đổi màu"
                                >
                                    <Palette className="w-2 h-2 text-slate-600" />
                                </button>
                                <button 
                                    onClick={(e) => deleteSticky(note.id, e)}
                                    className="text-slate-600 hover:text-red-600 transition"
                                    title="Xoá giấy note"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    <textarea
                        value={note.text}
                        onChange={(e) => handleStickyTextChange(note.id, e.target.value)}
                        placeholder={readOnly ? "" : "Ghi chú..."}
                        className="flex-1 p-2 bg-transparent resize-none border-none outline-none font-sans text-xs text-slate-800 placeholder-slate-500/60 leading-normal"
                        onPointerDown={(e) => e.stopPropagation()} 
                        readOnly={readOnly}
                    />

                    {!readOnly && (
                        <div 
                            onPointerDown={(e) => handleResizeStart(note.id, e)}
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize flex items-end justify-end p-0.5 pointer-events-auto"
                            title="Kéo rộng note"
                        >
                            <svg width="6" height="6" viewBox="0 0 6 6" className="text-slate-500 opacity-50">
                                <path d="M6 0 L0 6 M6 3 L3 6" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        </div>
                    )}
                </div>
            ))}

            {/* Draggable transparent text */}
            {textObjects.map((textObj) => {
                const fs = (textObj.fontSize || 14) * ratio;
                const w = (textObj.width || 150) * ratio;
                return (
                    <div
                        key={textObj.id}
                        className="absolute z-25 group select-none text-annotation-box flex items-center rounded hover:bg-slate-100/30 hover:ring-1 hover:ring-slate-350/50 dark:hover:bg-slate-800/20 dark:hover:ring-slate-700/60"
                        style={{
                            left: `${textObj.x * ratio}px`,
                            top: `${textObj.y * ratio}px`,
                            width: `${w}px`,
                            color: textObj.color,
                            fontSize: `${fs}px`,
                            lineHeight: '1.2',
                            pointerEvents: readOnly ? 'none' : 'auto'
                        }}
                        onPointerDown={(e) => {
                            if (readOnly) return;
                            if (!e.target.closest('.text-resize-handle')) {
                                handleDragStart('text', textObj.id, e);
                            }
                        }}
                        onDoubleClick={(e) => {
                            if (readOnly) return;
                            handleTextEditStart(textObj, e);
                        }}
                    >
                        <div className="w-full relative min-h-[1.5em] pr-4 break-words whitespace-pre-wrap font-sans text-left">
                            {textObj.text}
                            
                            {!readOnly && (
                                <>
                                    <button 
                                        onClick={(e) => deleteText(textObj.id, e)}
                                        className="absolute top-0 right-0 hidden group-hover:block p-0.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                        title="Xóa chữ"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>

                                    <div
                                        onPointerDown={(e) => handleTextResizeStart(textObj.id, 'horizontal', e)}
                                        className="text-resize-handle absolute top-0 bottom-0 -right-1.5 w-3 cursor-e-resize flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity"
                                        title="Kéo ngang để xuống dòng"
                                    >
                                        <div className="w-1 h-3 bg-indigo-500/80 rounded-full" />
                                    </div>

                                    <div
                                        onPointerDown={(e) => handleTextResizeStart(textObj.id, 'diagonal', e)}
                                        className="text-resize-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity"
                                        title="Kéo góc chéo để phóng to chữ"
                                    >
                                        <div className="w-2 h-2 bg-indigo-500/85 rounded-sm" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Active Inline Text Input Box (Auto-growing textarea) */}
            {textInputPos && (
                <div 
                    className="absolute z-40 bg-transparent flex items-center border border-dashed border-indigo-500 p-1 pointer-events-auto rounded bg-white/40 dark:bg-slate-900/40"
                    style={{
                        left: `${textInputPos.x}px`,
                        top: `${textInputPos.y - 12}px`
                    }}
                >
                    <textarea
                        id="canvas-inline-text-input"
                        value={textInputValue}
                        onChange={(e) => {
                            setTextInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onBlur={saveInlineText}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveInlineText();
                            } else if (e.key === 'Escape') {
                                setTextInputValue('');
                                setTextInputPos(null);
                            }
                        }}
                        placeholder="Nhập chữ..."
                        className="bg-transparent border-none outline-none font-sans text-sm p-0 min-w-[150px] resize-none overflow-hidden"
                        style={{ 
                            color: getResolvedPenColor(),
                            height: '24px',
                            lineHeight: '1.2'
                        }}
                    />
                </div>
            )}

            {/* Curve Drawing Guide Tooltip */}
            {curveState && curveState.step === 1 && (
                <div 
                    className="absolute z-50 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-md shadow pointer-events-none font-sans flex items-center gap-1"
                    style={{
                        left: `${curveState.control.x + 10}px`,
                        top: `${curveState.control.y + 10}px`
                    }}
                >
                    <span>Di chuyển chuột để uốn cong và CLICK để hoàn thành</span>
                </div>
            )}

            {/* Floating Toolbar and its options flyout drawer rendered in Portal */}
            {!readOnly && createPortal(
                <>
                    {/* Floating Options Flyout Drawer */}
                    {renderOptionsDrawer()}

                    {/* Floating Toolbar */}
                    <div 
                        ref={toolbarRef}
                        className={`fixed z-50 flex flex-col items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-200 select-none ${
                            isCollapsed ? 'py-2 px-1' : 'py-3 px-2'
                        }`}
                        style={{ 
                            left: toolbarPos.x !== null ? `${toolbarPos.x}px` : 'auto',
                            right: toolbarPos.x !== null ? 'auto' : '20px', 
                            top: `${toolbarPos.y}px`,
                            width: isCollapsed ? '46px' : '54px',
                            pointerEvents: 'auto'
                        }}
                    >
                        {/* Drag Handle & Toggle Collapse */}
                        <div 
                            onPointerDown={handleToolbarDragStart}
                            className="w-full flex flex-col items-center gap-0.5 cursor-move active:cursor-grabbing border-b border-slate-100 dark:border-slate-800 pb-2 mb-2"
                        >
                            <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100" />
                            <button 
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded cursor-pointer"
                                title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                            >
                                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* Toolbar Tools Container */}
                        <div className={`flex flex-col items-center gap-2.5 w-full ${isCollapsed ? 'hidden' : ''}`}>
                            {/* Cursor */}
                            <button
                                onClick={() => setActiveTool('cursor')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    activeTool === 'cursor' 
                                        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/25 scale-105' 
                                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Con trỏ chuột (Chọn đáp án đề thi)"
                            >
                                <MousePointer className="w-4.5 h-4.5" />
                            </button>

                            {/* Freehand Pen */}
                            <div className="relative group/tool">
                                <button
                                    onClick={() => setActiveTool('pen')}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                        activeTool === 'pen' 
                                            ? 'bg-red-500 text-white shadow-md shadow-red-500/25 scale-105' 
                                            : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title="Bút vẽ tự do (Xem màu ở menu phụ)"
                                >
                                    <Pencil className="w-4.5 h-4.5" />
                                </button>
                                
                                {activeTool === 'pen' && (
                                    <span 
                                        className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900"
                                        style={{ backgroundColor: getResolvedPenColor() }}
                                    />
                                )}
                            </div>

                            {/* Line & Curve Group Button */}
                            <button
                                onClick={() => { 
                                    if (activeTool !== 'line' && activeTool !== 'curve') {
                                        setActiveTool('line'); 
                                    }
                                }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative ${
                                    (activeTool === 'line' || activeTool === 'curve')
                                        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/25 scale-105' 
                                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Kẻ đường thẳng / đường cong (Nhấp mở menu phụ chọn loại nét)"
                            >
                                {activeTool === 'curve' ? <CurveIcon className="w-4.5 h-4.5" /> : <Minus className="w-4.5 h-4.5 rotate-45" />}
                                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-current opacity-60" style={{ transform: 'translate(-2px, -2px) rotate(45deg)' }} />
                            </button>

                            {/* Highlighter Group Button */}
                            <button
                                onClick={() => { 
                                    if (activeTool !== 'text-highlighter' && activeTool !== 'highlighter') {
                                        setActiveTool('text-highlighter'); 
                                    }
                                }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative ${
                                    (activeTool === 'text-highlighter' || activeTool === 'highlighter')
                                        ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/25 scale-105' 
                                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                style={{
                                    backgroundColor: (activeTool === 'text-highlighter' || activeTool === 'highlighter') ? highlighterColor : 'transparent',
                                    color: (activeTool === 'text-highlighter' || activeTool === 'highlighter') ? '#0f172a' : 'inherit'
                                }}
                                title="Bút highlight (Nhấp mở menu phụ chọn cách tô và màu sắc)"
                            >
                                {activeTool === 'highlighter' ? <Highlighter className="w-4.5 h-4.5" /> : <TextHighlightIcon className="w-4.5 h-4.5" />}
                                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-current opacity-60" style={{ transform: 'translate(-2px, -2px) rotate(45deg)' }} />
                            </button>

                            {/* Eraser */}
                            <button
                                onClick={() => setActiveTool('eraser')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    activeTool === 'eraser' 
                                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md scale-105' 
                                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Tẩy (Xóa nét vẽ, hoặc click chữ highlight để xóa)"
                            >
                                <Eraser className="w-4.5 h-4.5" />
                            </button>

                            {/* Text Tool */}
                            <button
                                onClick={() => setActiveTool('text')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    activeTool === 'text' 
                                        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/25 scale-105' 
                                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Gõ chữ trên đề (Kéo để di chuyển, double click để sửa)"
                            >
                                <Type className="w-4.5 h-4.5" />
                            </button>

                            {/* Sticky Note */}
                            <button
                                onClick={() => setActiveTool('sticky')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    activeTool === 'sticky' 
                                        ? 'bg-yellow-400 text-slate-900 shadow-md shadow-yellow-400/25 scale-105' 
                                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Chèn giấy note (Kéo để di chuyển, kéo góc dưới phải để phóng to)"
                            >
                                <StickyNote className="w-4.5 h-4.5" />
                            </button>

                            {/* Clear All */}
                            <button
                                onClick={clearAllAnnotations}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 mt-1 cursor-pointer"
                                title="Xoá toàn bộ nháp câu này"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>

                            {/* Help */}
                            <button
                                onClick={() => setShowHelp(!showHelp)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                    showHelp 
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' 
                                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Hướng dẫn sử dụng nháp"
                            >
                                <HelpCircle className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    </div>
                </>
                ,
                document.body
            )}

            {/* Help Dialog Modal */}
            {showHelp && !isCollapsed && !readOnly && createPortal(
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs font-sans">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm shadow-2xl space-y-4 text-left animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                <HelpCircle className="w-4.5 h-4.5 text-indigo-500" /> Hướng dẫn nháp JLPT
                            </h4>
                            <button 
                                onClick={() => setShowHelp(false)}
                                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                            <li className="flex items-start gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                                <span><b>Bút viết:</b> Vẽ tự do trên màn hình. Mở menu phụ để chọn màu viết.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                                <span><b>Đường thẳng & cong:</b> Chọn công cụ vẽ nét. Mở menu phụ để chọn kiểu kẻ thẳng hoặc vẽ cong.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                                <span><b>Bút highlight:</b> Bôi màu dạ quang. Mở menu phụ để chọn tô quét chữ, tô vẽ tự do và tùy ý chọn màu (Vàng, Xanh lá, Hồng).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                                <span><b>Tẩy:</b> Di chuột xóa nét vẽ tự do, hoặc click lên đoạn chữ đang highlight để gỡ bỏ.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">5</span>
                                <span><b>Ghi chú & Viết chữ:</b> Có thể viết nháp ở bất kỳ đâu, bao gồm cả khoảng trống lề hai bên đề thi.</span>
                            </li>
                        </ul>
                        <button 
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition text-xs cursor-pointer shadow-sm"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ExamAnnotationOverlay;
