import React, { useState, useEffect, useMemo } from 'react'
import LoadingIndicator from '../ui/LoadingIndicator';
import {
    collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, FileText, Headphones, BookOpen, Languages, AlertTriangle, CheckCircle, Loader2, Copy, Upload, ArrowLeft, Award, Bold, Underline, Highlighter, Italic, Strikethrough, AlignCenter, CornerDownLeft, Palette, Eraser, Type } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../router';
import { compressImage, fileToBase64 } from '../../utils/image';
const SECTION_TYPES = [
    { value: 'vocabulary', label: 'Từ vựng (文字・語彙)', icon: Languages, color: 'blue' },
    { value: 'grammar', label: 'Ngữ pháp (文法)', icon: BookOpen, color: 'purple' },
    { value: 'kanji', label: 'Hán tự (漢字)', icon: Award, color: 'teal' },
    { value: 'reading', label: 'Đọc hiểu (読解)', icon: FileText, color: 'green' },
    { value: 'listening', label: 'Nghe hiểu (聴解)', icon: Headphones, color: 'orange' },
];
// Helper to map values
const SKILL_LABELS = {
    vocabulary: 'Từ vựng',
    grammar: 'Ngữ pháp',
    kanji: 'Hán tự',
    reading: 'Đọc hiểu',
    listening: 'Nghe hiểu'
};
const EMPTY_QUESTION = {
    question: '', options: ['', '', '', ''], correctAnswer: 0,
    explanation: '', audioUrl: '', passage: '', imageUrl: '',
    subQuestions: []
};
const EMPTY_SECTION = { type: 'vocabulary', title: '', questions: [{ ...EMPTY_QUESTION }] };
const EMPTY_TEST = {
    title: '', level: 'N5', timeLimit: 60,
    isSkillTest: false,
    skillType: 'vocabulary',
    isPremium: false,
    sections: [{ ...EMPTY_SECTION, questions: [{ ...EMPTY_QUESTION }] }]
};
const SAMPLE_FULL_JSON = {
    title: "JLPT N5 - Đề mẫu 1 (Đầy đủ)",
    level: "N5",
    timeLimit: 60,
    isSkillTest: false,
    sections: [
        {
            type: "vocabulary",
            title: "Từ vựng (文字・語彙)",
            questions: [
                {
                    question: "「学校」の読み方は？",
                    options: ["がっこう", "がくこう", "がこう", "がっこ"],
                    correctAnswer: 0,
                    explanation: "学校（がっこう）= trường học"
                }
            ]
        },
        {
            type: "listening",
            title: "Nghe hiểu (聴解)",
            questions: [
                {
                    question: "Nghe và chọn đáp án đúng",
                    audioUrl: "https://example.com/audio.mp3",
                    imageUrl: "https://example.com/image.png",
                    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                    correctAnswer: 1,
                    explanation: "Giải thích..."
                }
            ]
        }
    ]
};
const getSampleJsonForSkill = (skillType) => {
    switch (skillType) {
        case 'listening':
            return {
                title: "Luyện chuyên sâu Nghe hiểu N5 - Bài 1",
                level: "N5",
                timeLimit: 15,
                isSkillTest: true,
                skillType: "listening",
                sections: [
                    {
                        type: "listening",
                        title: "Nghe hiểu (聴解)",
                        questions: [
                            {
                                question: "Nghe và chọn đáp án đúng nhất (Ví dụ: <u>質問</u>：男の人はこれからどうしますか？)",
                                audioUrl: "https://example.com/audio.mp3",
                                imageUrl: "https://example.com/image.png",
                                options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                                correctAnswer: 0,
                                explanation: "Giải thích lý do chọn đáp án A..."
                            }
                        ]
                    }
                ]
            };
        case 'reading':
            return {
                title: "Luyện chuyên sâu Đọc hiểu N5 - Bài 1",
                level: "N5",
                timeLimit: 20,
                isSkillTest: true,
                skillType: "reading",
                sections: [
                    {
                        type: "reading",
                        title: "Đọc hiểu (読解)",
                        questions: [
                            {
                                passage: "<b>[Đoạn văn đọc hiểu]</b><br/>これは日本語の文章です。質問を読んで答えてください。",
                                question: "質問：正しいものはどれですか？",
                                options: ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
                                correctAnswer: 0,
                                explanation: "Giải thích chi tiết vì sao đáp án 1 đúng dựa vào đoạn văn..."
                            }
                        ]
                    }
                ]
            };
        case 'kanji':
            return {
                title: "Luyện chuyên sâu Hán tự N5 - Bài 1",
                level: "N5",
                timeLimit: 10,
                isSkillTest: true,
                skillType: "kanji",
                sections: [
                    {
                        type: "kanji",
                        title: "Hán tự (漢字)",
                        questions: [
                            {
                                question: "「<u>日本語</u>」の漢字 của đọc là gì?",
                                options: ["にほんご", "にっぽんご", "にほんこ", "にほんごう"],
                                correctAnswer: 0,
                                explanation: "日本語 = にほんご (Tiếng Nhật)"
                            }
                        ]
                    }
                ]
            };
        case 'grammar':
            return {
                title: "Luyện chuyên sâu Ngữ pháp N5 - Bài 1",
                level: "N5",
                timeLimit: 12,
                isSkillTest: true,
                skillType: "grammar",
                sections: [
                    {
                        type: "grammar",
                        title: "Ngữ pháp (文法)",
                        questions: [
                            {
                                question: "わたしは 毎日 日本語 ____ 勉強します。",
                                options: ["が", "を", "に", "で"],
                                correctAnswer: 1,
                                explanation: "Trợ từ を dùng để chỉ đối tượng trực tiếp tác động của động từ 勉強します."
                            },
                            {
                                passage: "<b>[Đoạn văn điền từ]</b><br/>きのう私はともだちとレストランへ行きました。...(1)...、とてもおいしい料理を食べました。",
                                question: "Chọn phương án đúng nhất cho các câu hỏi phụ dưới đây.",
                                subQuestions: [
                                    {
                                        question: "Chỗ trống (1):",
                                        options: ["그리고 / そして", "하지만 / しかし", "그래서 / だから", "그러므로 / そこで"],
                                        correctAnswer: 0,
                                        explanation: "Dùng '그리고 / そして' để biểu thị chuỗi hành động nối tiếp: đi đến nhà hàng rồi ăn đồ ăn ngon."
                                    },
                                    {
                                        question: "Trợ từ điền vào vế sau (料理____食べました):",
                                        options: ["が", "を", "に", "で"],
                                        correctAnswer: 1,
                                        explanation: "Cấu trúc tác động trực tiếp của hành động ăn: 料理を食べます -> đi kèm trợ từ を."
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };
        case 'vocabulary':
        default:
            return {
                title: "Luyện chuyên sâu Từ vựng N5 - Bài 1",
                level: "N5",
                timeLimit: 10,
                isSkillTest: true,
                skillType: "vocabulary",
                sections: [
                    {
                        type: "vocabulary",
                        title: "Từ vựng (文字・語彙)",
                        questions: [
                            {
                                question: "「学校」の đọc là gì?",
                                options: ["がっこう", "がくこう", "がこう", "がっこ"],
                                correctAnswer: 0,
                                explanation: "学校（がっこう）= trường học"
                            }
                        ]
                    }
                ]
            };
    }
};

const SAMPLE_FLAT_JSON = {
    title: "JLPT N5 - Đề mẫu 1 (Dạng phẳng decimal)",
    level: "N5",
    timeLimit: 60,
    isSkillTest: false,
    sections: [
        {
            type: "reading",
            title: "Đọc hiểu (読解)",
            questions: [
                {
                    id: "1",
                    passage: "<b>[Đoạn văn đọc hiểu]</b><br/>これは日本語の文章です。質問を読んで答えてください。",
                    question: "Đọc đoạn văn sau và trả lời các câu hỏi phụ bên dưới."
                },
                {
                    id: "1.1",
                    question: "質問1：正しいものはどれですか？",
                    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                    correctAnswer: 0,
                    explanation: "Giải thích lý do chọn đáp án A..."
                },
                {
                    id: "1.2",
                    question: "質問2：下線部はどういう意味ですか？",
                    options: ["Ý nghĩa A", "Ý nghĩa B", "Ý nghĩa C", "Ý nghĩa D"],
                    correctAnswer: 2,
                    explanation: "Giải thích..."
                }
            ]
        }
    ]
};

const HighlightedHtmlTextarea = ({ value, onChange, placeholder, id }) => {
    const [text, setText] = useState(value || '');

    useEffect(() => {
        setText(value || '');
    }, [value]);

    const textareaRef = React.useRef(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [text]);

    const getHighlightedHtml = (rawText) => {
        if (!rawText) return '';
        let escaped = rawText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        return escaped.replace(/(&lt;\/?[a-zA-Z0-9]+(?: [^&]*)?&gt;)/g, (match) => {
            const lower = match.toLowerCase();
            if (lower.includes('ruby')) {
                return `<span class="text-rose-600 dark:text-rose-455 font-extrabold">${match}</span>`;
            } else if (lower.includes('rt')) {
                return `<span class="text-emerald-600 dark:text-emerald-455 font-extrabold">${match}</span>`;
            } else if (lower.includes('br')) {
                return `<span class="text-purple-650 dark:text-purple-400 font-extrabold">${match}</span>`;
            } else if (lower.includes('span') || lower.includes('div')) {
                return `<span class="text-blue-650 dark:text-sky-400 font-bold">${match}</span>`;
            } else {
                return `<span class="text-amber-650 dark:text-amber-400 font-bold">${match}</span>`;
            }
        });
    };

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {/* Highlights container */}
            <div
                className="absolute inset-0 p-3.5 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all pointer-events-none overflow-hidden text-slate-850 dark:text-slate-200"
                style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                }}
                dangerouslySetInnerHTML={{ __html: getHighlightedHtml(text) + '\n' }}
            />
            {/* The Textarea */}
            <textarea
                id={id}
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                    onChange(e);
                    setText(e.target.value);
                }}
                placeholder={placeholder}
                className="relative w-full p-3.5 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all bg-transparent border-0 outline-none ring-0 focus:ring-0 resize-none overflow-hidden caret-slate-800 dark:caret-white text-transparent selection:bg-[#2E5B70]/25"
                style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    WebkitTextFillColor: 'transparent',
                }}
            />
        </div>
    );
};

const normalizeQuestions = (rawQuestions) => {
    if (!Array.isArray(rawQuestions)) return [];
    
    const processed = [];
    let currentParent = null;
    
    rawQuestions.forEach((q) => {
        const idStr = String(q.id || q.number || '');
        const isSub = idStr.includes('.') || 
                      q.parentId !== undefined || 
                      q.parentQuestionId !== undefined || 
                      (q.question && /^(câu|question|q)?\s*\d+\.\d+/i.test(q.question.trim()));
                      
        const questionObj = {
            question: q.question || '',
            options: q.options || (q.subQuestions && q.subQuestions.length > 0 ? [] : ['', '', '', '']),
            correctAnswer: q.correctAnswer ?? 0,
            explanation: q.explanation || '',
            audioUrl: q.audioUrl || '',
            passage: q.passage || '',
            imageUrl: q.imageUrl || '',
            subQuestions: []
        };
        
        if (isSub) {
            const subQuestionObj = {
                question: q.question || '',
                options: q.options || ['', '', '', ''],
                correctAnswer: q.correctAnswer ?? 0,
                explanation: q.explanation || ''
            };
            
            if (currentParent) {
                currentParent.options = [];
                currentParent.subQuestions.push(subQuestionObj);
            } else {
                processed.push(questionObj);
            }
        } else {
            if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                questionObj.options = [];
                questionObj.subQuestions = q.subQuestions.map(sq => ({
                    question: sq.question || '',
                    options: sq.options || ['', '', '', ''],
                    correctAnswer: sq.correctAnswer ?? 0,
                    explanation: sq.explanation || ''
                }));
            }
            currentParent = questionObj;
            processed.push(currentParent);
        }
    });
    
    return processed;
};

const JLPTAdminScreen = ({ userId }) => {
    const location = useLocation();
    const [tests, setTests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevelFilter, setSelectedLevelFilter] = useState('All');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [editingTest, setEditingTest] = useState(null);
    const [formData, setFormData] = useState({ ...EMPTY_TEST });
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [importType, setImportType] = useState('full');
    const [importSkillType, setImportSkillType] = useState('vocabulary');
    const [importMethod, setImportMethod] = useState('overwrite');
    const testsPath = `artifacts/${appId}/jlptTests`;
    const [activeFieldsTabs, setActiveFieldsTabs] = useState({});

    const getTab = (sectionIdx, questionIdx, field) => {
        return activeFieldsTabs[`${sectionIdx}-${questionIdx}-${field}`] || 'preview';
    };

    const setActiveTab = (sectionIdx, questionIdx, field, tab) => {
        if (tab === 'html') {
            setFormData(prev => {
                const updated = { ...prev };
                const section = updated.sections[sectionIdx];
                if (section && section.questions) {
                    const q = section.questions[questionIdx];
                    if (q) {
                        const currentVal = q[field] || '';
                        const formatted = currentVal.replace(/(<br\s*\/?>)(?!\s*\n)/gi, '$1\n');
                        if (formatted !== currentVal) {
                            q[field] = formatted;
                        }
                    }
                }
                return updated;
            });
        }
        setActiveFieldsTabs(prev => ({
            ...prev,
            [`${sectionIdx}-${questionIdx}-${field}`]: tab
        }));
    };
    
    const filteredTests = useMemo(() => {
        return tests.filter(test => {
            const matchesSearch = searchQuery.trim() === '' || 
                test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (test.level && test.level.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesLevel = selectedLevelFilter === 'All' || test.level === selectedLevelFilter;

            let matchesType = true;
            if (selectedTypeFilter === 'full') {
                matchesType = !test.isSkillTest;
            } else if (selectedTypeFilter === 'skill') {
                matchesType = !!test.isSkillTest;
            }

            return matchesSearch && matchesLevel && matchesType;
        });
    }, [tests, searchQuery, selectedLevelFilter, selectedTypeFilter]);
    // Load tests
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, testsPath), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [testsPath]);
    // Notification auto-clear
    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(t);
        }
    }, [notification]);
    const notify = (type, message) => setNotification({ type, message });
    // Handle type change (Full vs Skill)
    const handleTestTypeChange = (isSkill) => {
        const sections = isSkill 
            ? [{ type: formData.skillType, title: SKILL_LABELS[formData.skillType], questions: [{ ...EMPTY_QUESTION }] }]
            : [{ ...EMPTY_SECTION, type: 'vocabulary', title: 'Từ vựng (文字・語彙)', questions: [{ ...EMPTY_QUESTION }] }];
        setFormData({
            ...formData,
            isSkillTest: isSkill,
            sections
        });
    };
    const handleSkillTypeChange = (skill) => {
        const sections = [{ type: skill, title: SKILL_LABELS[skill], questions: [{ ...EMPTY_QUESTION }] }];
        setFormData({
            ...formData,
            skillType: skill,
            sections
        });
    };
    // Save test
    const handleSave = async () => {
        if (!formData.title.trim()) { notify('error', 'Vui lòng nhập tên đề thi'); return; }
        if (formData.sections.length === 0) { notify('error', 'Cần ít nhất 1 phần thi'); return; }
        // Validate all sections & questions
        for (let sIdx = 0; sIdx < formData.sections.length; sIdx++) {
            const sec = formData.sections[sIdx];
            if (!sec.title.trim()) { notify('error', `Phần ${sIdx + 1} cần có tiêu đề`); return; }
            for (let qIdx = 0; qIdx < sec.questions.length; qIdx++) {
                const q = sec.questions[qIdx];
                if (!q.question.trim() && !q.passage?.trim()) { 
                    notify('error', `Phần "${sec.title}" - Câu ${qIdx + 1} chưa nhập nội dung câu hỏi hoặc đoạn văn`); 
                    return; 
                }
                if (q.subQuestions && q.subQuestions.length > 0) {
                    for (let sqIdx = 0; sqIdx < q.subQuestions.length; sqIdx++) {
                        const sq = q.subQuestions[sqIdx];
                        if (sq.options.some(o => !o.trim())) {
                            notify('error', `Phần "${sec.title}" - Câu ${qIdx + 1} - Câu hỏi phụ ${sqIdx + 1} có đáp án trống`);
                            return;
                        }
                    }
                } else {
                    if (q.options.some(o => !o.trim())) { 
                        notify('error', `Phần "${sec.title}" - Câu ${qIdx + 1} có đáp án trống`); 
                        return; 
                    }
                }
            }
        }
        setSaving(true);
        try {
            const testId = editingTest?.id || `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const testData = {
                ...formData,
                isSkillTest: !!formData.isSkillTest,
                skillType: formData.isSkillTest ? formData.skillType : '',
                isPremium: !!formData.isPremium,
                updatedAt: serverTimestamp(),
                updatedBy: userId || 'admin',
            };
            if (!editingTest) {
                testData.createdAt = serverTimestamp();
                testData.createdBy = userId || 'admin';
            } else {
                testData.createdAt = editingTest.createdAt || serverTimestamp();
                testData.createdBy = editingTest.createdBy || 'admin';
            }
            await setDoc(doc(db, testsPath, testId), testData);
            notify('success', editingTest ? 'Cập nhật đề thi thành công!' : 'Tạo đề thi mới thành công!');
            resetForm();
        } catch (e) {
            console.error(e);
            notify('error', 'Lỗi: ' + e.message);
        } finally {
            setSaving(false);
        }
    };
    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, testsPath, confirmDelete.id));
            notify('success', 'Đã xóa đề thi thành công');
            if (editingTest?.id === confirmDelete.id) resetForm();
        } catch (e) {
            notify('error', 'Lỗi: ' + e.message);
        } finally {
            setConfirmDelete(null);
        }
    };
    const resetForm = () => {
        setEditingTest(null);
        setFormData(JSON.parse(JSON.stringify(EMPTY_TEST)));
        setExpandedSections({});
    };
    const handleEdit = (test) => {
        setEditingTest(test);
        setFormData({
            title: test.title || '',
            level: test.level || 'N5',
            timeLimit: test.timeLimit || 60,
            isSkillTest: !!test.isSkillTest,
            skillType: test.skillType || 'vocabulary',
            isPremium: !!test.isPremium,
            sections: test.sections || [],
        });
        setExpandedSections({ 0: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    useEffect(() => {
        if (location.state?.editTest) {
            handleEdit(location.state.editTest);
            // Clear the history state to prevent re-entering edit mode on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);
    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (importMethod === 'overwrite') {
                if (!parsed.title || !parsed.sections) throw new Error('JSON thiếu trường title hoặc sections bắt buộc.');
            } else {
                if (!parsed.sections) throw new Error('JSON thiếu trường sections bắt buộc.');
            }
            const isSkill = importType === 'skill';
            const skillType = isSkill ? importSkillType : '';
            if (importMethod === 'overwrite') {
                setFormData({
                    title: parsed.title || '',
                    level: parsed.level || 'N5',
                    timeLimit: parsed.timeLimit || 60,
                    isSkillTest: isSkill,
                    skillType: skillType,
                    sections: parsed.sections.map(s => ({
                        type: isSkill ? skillType : (s.type || 'vocabulary'),
                        title: isSkill ? (SKILL_LABELS[skillType] || s.title) : (s.title || ''),
                        questions: normalizeQuestions(s.questions)
                    }))
                });
            } else {
                // APPEND METHOD: Append questions to existing sections
                const currentSections = [...formData.sections];
                parsed.sections.forEach(parsedSec => {
                    const parsedType = isSkill ? skillType : (parsedSec.type || 'vocabulary');
                    const parsedTitle = isSkill ? (SKILL_LABELS[skillType] || parsedSec.title) : (parsedSec.title || '');
                    const newQuestions = normalizeQuestions(parsedSec.questions);
                    const existingSecIdx = currentSections.findIndex(s => s.type === parsedType);
                    if (existingSecIdx !== -1) {
                        // Clear the single initial empty placeholder question if it's the only one
                        let baseQuestions = currentSections[existingSecIdx].questions || [];
                        if (baseQuestions.length === 1 && !baseQuestions[0].question.trim() && !baseQuestions[0].passage?.trim() && (!baseQuestions[0].subQuestions || baseQuestions[0].subQuestions.length === 0)) {
                            baseQuestions = [];
                        }
                        currentSections[existingSecIdx] = {
                            ...currentSections[existingSecIdx],
                            questions: [...baseQuestions, ...newQuestions]
                        };
                    } else {
                        currentSections.push({
                            type: parsedType,
                            title: parsedTitle,
                            questions: newQuestions
                        });
                    }
                });
                setFormData({
                    ...formData,
                    sections: currentSections
                });
            }
            setShowJsonImport(false);
            setJsonInput('');
            notify('success', importMethod === 'overwrite' ? 'Đã nhập dữ liệu JSON thành công!' : 'Đã bổ sung câu hỏi từ JSON thành công!');
        } catch (e) {
            notify('error', 'JSON không hợp lệ: ' + e.message);
        }
    };
    // Section/Question modifiers
    const updateSection = (si, field, value) => {
        const s = [...formData.sections];
        if (typeof field === 'object' && field !== null) {
            s[si] = { ...s[si], ...field };
        } else {
            s[si] = { ...s[si], [field]: value };
        }
        setFormData({ ...formData, sections: s });
    };
    const addSection = () => {
        const newSections = [...formData.sections, JSON.parse(JSON.stringify(EMPTY_SECTION))];
        setFormData({ ...formData, sections: newSections });
        setExpandedSections({ ...expandedSections, [newSections.length - 1]: true });
    };
    const removeSection = (si) => {
        setFormData({ ...formData, sections: formData.sections.filter((_, i) => i !== si) });
    };
    const updateQuestion = (si, qi, field, value) => {
        const s = [...formData.sections];
        const qs = [...s[si].questions];
        qs[qi] = { ...qs[qi], [field]: value };
        s[si] = { ...s[si], questions: qs };
        setFormData({ ...formData, sections: s });
    };
    const updateOption = (si, qi, oi, value) => {
        const s = [...formData.sections];
        const qs = [...s[si].questions];
        const opts = [...qs[qi].options];
        opts[oi] = value;
        qs[qi] = { ...qs[qi], options: opts };
        s[si] = { ...s[si], questions: qs };
        setFormData({ ...formData, sections: s });
    };
    const addQuestion = (si) => {
        const s = [...formData.sections];
        s[si] = { ...s[si], questions: [...s[si].questions, { ...EMPTY_QUESTION }] };
        setFormData({ ...formData, sections: s });
    };
    const removeQuestion = (si, qi) => {
        const s = [...formData.sections];
        s[si] = { ...s[si], questions: s[si].questions.filter((_, i) => i !== qi) };
        setFormData({ ...formData, sections: s });
    };
    const insertFormatTag = (sectionIdx, questionIdx, field, tag) => {
        const id = `textarea-${sectionIdx}-${questionIdx}-${field}`;
        const textarea = document.getElementById(id);
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        
        let replacement = '';
        let cursorOffset = 0;
        let cursorLength = 0;

        switch (tag) {
            case 'b':
                replacement = `<b>${selectedText || 'chữ in đậm'}</b>`;
                cursorOffset = 3;
                cursorLength = (selectedText || 'chữ in đậm').length;
                break;
            case 'i':
                replacement = `<i>${selectedText || 'chữ in nghiêng'}</i>`;
                cursorOffset = 3;
                cursorLength = (selectedText || 'chữ in nghiêng').length;
                break;
            case 'u':
                replacement = `<u>${selectedText || 'chữ gạch chân'}</u>`;
                cursorOffset = 3;
                cursorLength = (selectedText || 'chữ gạch chân').length;
                break;
            case 's':
                replacement = `<s>${selectedText || 'chữ gạch ngang'}</s>`;
                cursorOffset = 3;
                cursorLength = (selectedText || 'chữ gạch ngang').length;
                break;
            case 'mark':
                replacement = `<mark>${selectedText || 'chữ highlight'}</mark>`;
                cursorOffset = 6;
                cursorLength = (selectedText || 'chữ highlight').length;
                break;
            case 'center':
                replacement = `<div style="text-align: center;">${selectedText || 'nội dung căn giữa'}</div>`;
                cursorOffset = 32;
                cursorLength = (selectedText || 'nội dung căn giữa').length;
                break;
            case 'red':
                replacement = `<span style="color: #ef4444;">${selectedText || 'chữ màu đỏ'}</span>`;
                cursorOffset = 29;
                cursorLength = (selectedText || 'chữ màu đỏ').length;
                break;
            case 'blue':
                replacement = `<span style="color: #3b82f6;">${selectedText || 'chữ màu xanh'}</span>`;
                cursorOffset = 29;
                cursorLength = (selectedText || 'chữ màu xanh').length;
                break;
            case 'large':
                replacement = `<span style="font-size: 1.25em;">${selectedText || 'chữ lớn'}</span>`;
                cursorOffset = 30;
                cursorLength = (selectedText || 'chữ lớn').length;
                break;
            case 'br':
                replacement = `${selectedText}<br/>\n`;
                cursorOffset = selectedText.length + 6;
                cursorLength = 0;
                break;
            case 'ruby':
                replacement = `<ruby>${selectedText || '漢字'}<rt>かんじ</rt></ruby>`;
                cursorOffset = 6;
                cursorLength = (selectedText || '漢字').length;
                break;
            case 'clear':
                replacement = selectedText.replace(/<\/?[^>]+(>|$)/g, "");
                cursorOffset = 0;
                cursorLength = replacement.length;
                break;
            default:
                replacement = selectedText;
                cursorOffset = 0;
                cursorLength = selectedText.length;
        }

        const newText = text.substring(0, start) + replacement + text.substring(end);
        updateQuestion(sectionIdx, questionIdx, field, newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + cursorLength);
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }, 0);
    };

    const applyRichFormat = (sectionIdx, questionIdx, field, tag) => {
        const isHtmlTab = getTab(sectionIdx, questionIdx, field) === 'html';
        
        if (isHtmlTab) {
            insertFormatTag(sectionIdx, questionIdx, field, tag);
            return;
        }

        const editorId = `editor-${sectionIdx}-${questionIdx}-${field}`;
        const editor = document.getElementById(editorId);
        if (!editor) return;

        editor.focus();
        document.execCommand('styleWithCSS', false, true);

        switch (tag) {
            case 'b':
                document.execCommand('bold', false, null);
                break;
            case 'i':
                document.execCommand('italic', false, null);
                break;
            case 'u':
                document.execCommand('underline', false, null);
                break;
            case 's':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'mark':
                document.execCommand('backColor', false, '#fef08a');
                break;
            case 'center':
                document.execCommand('justifyCenter', false, null);
                break;
            case 'red':
                document.execCommand('foreColor', false, '#ef4444');
                break;
            case 'blue':
                document.execCommand('foreColor', false, '#3b82f6');
                break;
            case 'large':
                document.execCommand('fontSize', false, '4');
                break;
            case 'br':
                document.execCommand('insertHTML', false, '<br/>');
                break;
            case 'ruby':
                const selection = window.getSelection().toString();
                const rubyHtml = `<ruby>${selection || '漢字'}<rt>かんじ</rt></ruby>`;
                document.execCommand('insertHTML', false, rubyHtml);
                break;
            case 'clear':
                document.execCommand('removeFormat', false, null);
                break;
            default:
                break;
        }

        updateQuestion(sectionIdx, questionIdx, field, editor.innerHTML);
    };

    const handleAudioUpload = async (si, qi, file) => {
        if (!file) return;
        try {
            const base64Audio = await fileToBase64(file);
            updateQuestion(si, qi, 'audioUrl', base64Audio);
            notify('success', 'Đã tải lên audio thành công!');
        } catch (error) {
            console.error('Audio upload error:', error);
            notify('error', 'Lỗi tải audio: ' + error.message);
        }
    };
    const handleImageUpload = async (si, qi, file) => {
        if (!file) return;
        try {
            const base64Image = await compressImage(file);
            updateQuestion(si, qi, 'imageUrl', base64Image);
            notify('success', 'Đã tải lên hình ảnh thành công!');
        } catch (error) {
            console.error('Image upload error:', error);
            notify('error', 'Lỗi tải hình ảnh: ' + error.message);
        }
    };
    const toggleSection = (i) => setExpandedSections(p => ({ ...p, [i]: !p[i] }));
    const totalQuestions = formData.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
    const getSectionMeta = (type) => SECTION_TYPES.find(s => s.value === type) || SECTION_TYPES[0];
    // Render
    if (loading) {
        return <LoadingIndicator text="Đang tải dữ liệu cấu hình..." />;
    }
    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to={ROUTES.JLPT_TEST} className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                <FileText className="w-6 h-6 text-[#2E5B70]" />
                                Quản lý đề thi & luyện tập JLPT
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cấu hình đề thi thử đầy đủ hoặc bài luyện tập chuyên sâu cho từng kỹ năng</p>
                        </div>
                    </div>
                    <div className="flex gap-2.5">
                        <button onClick={() => setShowJsonImport(true)}
                            className="px-4 py-2 text-xs font-bold bg-[#2E5B70] text-white rounded-xl hover:bg-[#254A5C] transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                            <Upload className="w-4 h-4" /> Nhập JSON
                        </button>
                    </div>
                </div>
                {/* Form nhập liệu */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <h2 className="font-extrabold text-slate-800 dark:text-white text-base">
                            {editingTest ? '✏️ Chỉnh sửa đề thi / bài luyện' : '➕ Thêm đề thi hoặc bài luyện mới'}
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Cấu hình loại đề */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Loại đề ôn tập</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTestTypeChange(false)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${!formData.isSkillTest 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Đề thi thử đầy đủ (Full Test)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTestTypeChange(true)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${formData.isSkillTest 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Luyện chuyên sâu 1 kỹ năng
                                    </button>
                                </div>
                            </div>
                            {formData.isSkillTest && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chọn kỹ năng luyện tập</label>
                                    <select 
                                        value={formData.skillType} 
                                        onChange={e => handleSkillTypeChange(e.target.value)}
                                        className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#2E5B70]/10"
                                    >
                                        {Object.entries(SKILL_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        {/* Thông tin cơ bản */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tên đề thi / bài luyện</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="VD: Đề thi thử JLPT N2 - Đề số 1" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cấp độ (JLPT Level)</label>
                                <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none">
                                    {['N5', 'N4', 'N3', 'N2', 'N1'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Thời gian làm bài (Phút)</label>
                                <input type="number" value={formData.timeLimit} onChange={e => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                                    min={5} max={300} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none" />
                            </div>
                            <div className="flex items-center md:pt-6">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isPremium || false} 
                                        onChange={e => setFormData({ ...formData, isPremium: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-200 text-[#2E5B70] focus:ring-[#2E5B70]/20"
                                    />
                                    <span className="text-xs font-bold text-slate-655 dark:text-slate-350 uppercase tracking-wider">Đề thi VIP (Premium)</span>
                                </label>
                            </div>
                        </div>
                        {/* Quản lý các phần thi */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                                    Cấu trúc đề thi ({formData.sections.length} phần) • Tổng số: {totalQuestions} câu hỏi
                                </h3>
                                {!formData.isSkillTest && (
                                    <button onClick={addSection} className="px-3.5 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                                        <Plus className="w-3.5 h-3.5" /> Thêm phần thi
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {formData.sections.map((section, si) => {
                                    const meta = getSectionMeta(section.type);
                                    const Icon = meta.icon || FileText;
                                    const isExpanded = expandedSections[si] !== false; // Default expanded
                                    return (
                                        <div key={si} className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                                            {/* Header phần */}
                                            <div className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/20 cursor-pointer border-b border-slate-100 dark:border-slate-700/50"
                                                onClick={() => toggleSection(si)}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${meta.color}-50 dark:bg-${meta.color}-950/20 text-${meta.color}-600`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-extrabold text-slate-800 dark:text-white text-xs block">
                                                            PHẦN {si + 1}: {section.title || SKILL_LABELS[section.type] || section.type}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold">{section.questions.length} câu hỏi • Thể loại: {SKILL_LABELS[section.type] || section.type}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                    {!formData.isSkillTest && formData.sections.length > 1 && (
                                                        <button onClick={() => removeSection(si)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => toggleSection(si)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="p-5 space-y-5 bg-white dark:bg-slate-800">
                                                    {/* Loại phần thi (chỉ cho phép sửa nếu không phải là đề luyện kỹ năng chuyên biệt) */}
                                                    {!formData.isSkillTest && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại kỹ năng</label>
                                                                <select value={section.type} onChange={e => updateSection(si, { type: e.target.value, title: SKILL_LABELS[e.target.value] })}
                                                                    className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white outline-none">
                                                                    {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiêu đề hiển thị</label>
                                                                <input type="text" value={section.title} onChange={e => updateSection(si, 'title', e.target.value)}
                                                                    placeholder="VD: Từ vựng - Moji Goi" className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white outline-none" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Câu hỏi con */}
                                                    <div className="space-y-4 pt-2">
                                                        {section.questions.map((q, qi) => (
                                                            <div key={qi} className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Câu hỏi số {qi + 1}</span>
                                                                    {section.questions.length > 1 && (
                                                                        <button onClick={() => removeQuestion(si, qi)} className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer">
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1 mb-2">
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setActiveTab(si, qi, 'question', 'preview')}
                                                                                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                                                                                    getTab(si, qi, 'question') === 'preview'
                                                                                        ? 'bg-[#2E5B70] text-white'
                                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                                                }`}
                                                                            >
                                                                                Nội dung
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setActiveTab(si, qi, 'question', 'html')}
                                                                                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                                                                                    getTab(si, qi, 'question') === 'html'
                                                                                        ? 'bg-[#2E5B70] text-white'
                                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                                                }`}
                                                                            >
                                                                                Mã HTML (Câu hỏi)
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'b')} title="In đậm (Bold)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Bold className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'i')} title="In nghiêng (Italic)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Italic className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'u')} title="Gạch chân (Underline)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Underline className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 's')} title="Gạch ngang (Strikethrough)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Strikethrough className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'mark')} title="Tô sáng (Highlight)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Highlighter className="w-3.5 h-3.5" /></button>
                                                                            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'red')} title="Màu đỏ" className="px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-red-500 rounded cursor-pointer transition font-extrabold text-[10px]">Đỏ</button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'blue')} title="Màu xanh" className="px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-blue-500 rounded cursor-pointer transition font-extrabold text-[10px]">Xanh</button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'large')} title="Cỡ chữ lớn" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Type className="w-3.5 h-3.5" /></button>
                                                                            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'center')} title="Căn giữa" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><AlignCenter className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'br')} title="Xuống dòng" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><CornerDownLeft className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'ruby')} title="Thêm Furigana (phiên âm)" className="px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition font-bold text-[10px] bg-slate-200/50 dark:bg-slate-600/50">漢(かん)</button>
                                                                            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                                            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'question', 'clear')} title="Xóa định dạng HTML" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Eraser className="w-3.5 h-3.5" /></button>
                                                                        </div>
                                                                    </div>
                                                                    {getTab(si, qi, 'question') === 'html' ? (
                                                                        <HighlightedHtmlTextarea
                                                                            id={`textarea-${si}-${qi}-question`}
                                                                            value={q.question}
                                                                            onChange={e => updateQuestion(si, qi, 'question', e.target.value)}
                                                                            placeholder="Nhập nội dung câu hỏi..."
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            id={`editor-${si}-${qi}-question`}
                                                                            contentEditable
                                                                            suppressContentEditableWarning
                                                                            onBlur={(e) => updateQuestion(si, qi, 'question', e.currentTarget.innerHTML)}
                                                                            className="p-3.5 min-h-[50px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm font-japanese leading-relaxed text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#2E5B70]"
                                                                            dangerouslySetInnerHTML={{ __html: q.question || '' }}
                                                                            placeholder="Nhập nội dung câu hỏi..."
                                                                        />
                                                                    )}
                                                                </div>
                                                                {/* Đoạn văn cho Đọc hiểu */}
                                                                {section.type === 'reading' && (
                                                                    <div>
                                                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1 mb-2">
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setActiveTab(si, qi, 'passage', 'preview')}
                                                                                    className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                                                                                        getTab(si, qi, 'passage') === 'preview'
                                                                                            ? 'bg-[#2E5B70] text-white'
                                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                                                    }`}
                                                                                >
                                                                                    Nội dung
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setActiveTab(si, qi, 'passage', 'html')}
                                                                                    className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                                                                                        getTab(si, qi, 'passage') === 'html'
                                                                                            ? 'bg-[#2E5B70] text-white'
                                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                                                    }`}
                                                                                >
                                                                                    Mã HTML (Đoạn văn)
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'b')} title="In đậm (Bold)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Bold className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'i')} title="In nghiêng (Italic)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Italic className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'u')} title="Gạch chân (Underline)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Underline className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 's')} title="Gạch ngang (Strikethrough)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Strikethrough className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'mark')} title="Tô sáng (Highlight)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Highlighter className="w-3.5 h-3.5" /></button>
                                                                                <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'red')} title="Màu đỏ" className="px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-red-500 rounded cursor-pointer transition font-extrabold text-[10px]">Đỏ</button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'blue')} title="Màu xanh" className="px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-blue-500 rounded cursor-pointer transition font-extrabold text-[10px]">Xanh</button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'large')} title="Cỡ chữ lớn" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Type className="w-3.5 h-3.5" /></button>
                                                                                <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'center')} title="Căn giữa" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><AlignCenter className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'br')} title="Xuống dòng" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><CornerDownLeft className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'ruby')} title="Thêm Furigana (phiên âm)" className="px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition font-bold text-[10px] bg-slate-200/50 dark:bg-slate-600/50">漢(かん)</button>
                                                                                <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                                                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyRichFormat(si, qi, 'passage', 'clear')} title="Xóa định dạng HTML" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"><Eraser className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        </div>
                                                                        {getTab(si, qi, 'passage') === 'html' ? (
                                                                            <HighlightedHtmlTextarea
                                                                                id={`textarea-${si}-${qi}-passage`}
                                                                                value={q.passage || ''}
                                                                                onChange={e => updateQuestion(si, qi, 'passage', e.target.value)}
                                                                                placeholder="Nhập đoạn văn bản tiếng Nhật..."
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                id={`editor-${si}-${qi}-passage`}
                                                                                contentEditable
                                                                                suppressContentEditableWarning
                                                                                onBlur={(e) => updateQuestion(si, qi, 'passage', e.currentTarget.innerHTML)}
                                                                                className="p-3.5 min-h-[96px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm font-japanese leading-relaxed text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#2E5B70]"
                                                                                dangerouslySetInnerHTML={{ __html: q.passage || '' }}
                                                                                placeholder="Nhập đoạn văn đọc hiểu..."
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {/* File Audio và Hình ảnh cho Nghe hiểu */}
                                                                {section.type === 'listening' && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/20 dark:bg-orange-950/5 p-3 rounded-2xl border border-orange-100 dark:border-orange-900/50">
                                                                        {/* Audio Upload/URL Section */}
                                                                        <div className="space-y-2">
                                                                            <label className="block text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">File âm thanh (Audio)</label>
                                                                            <div className="flex gap-2">
                                                                                <input 
                                                                                    type="text" 
                                                                                    value={q.audioUrl && q.audioUrl.startsWith('data:') ? 'Đã tải lên file Audio' : (q.audioUrl || '')} 
                                                                                    onChange={e => updateQuestion(si, qi, 'audioUrl', e.target.value)}
                                                                                    disabled={q.audioUrl && q.audioUrl.startsWith('data:')}
                                                                                    placeholder="Nhập đường dẫn hoặc tải lên..." 
                                                                                    className="flex-1 px-3 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none" 
                                                                                />
                                                                                <label className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 select-none">
                                                                                    Tải lên
                                                                                    <input 
                                                                                        type="file" 
                                                                                        accept="audio/*" 
                                                                                        onChange={e => handleAudioUpload(si, qi, e.target.files[0])} 
                                                                                        className="hidden" 
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                            {q.audioUrl && (
                                                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                                                    <audio src={q.audioUrl} controls className="h-6 max-w-full text-xs" />
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => updateQuestion(si, qi, 'audioUrl', '')} 
                                                                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {/* Image Upload/URL Section */}
                                                                        <div className="space-y-2">
                                                                            <label className="block text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Hình ảnh câu hỏi (Image)</label>
                                                                            <div className="flex gap-2">
                                                                                <input 
                                                                                    type="text" 
                                                                                    value={q.imageUrl && q.imageUrl.startsWith('data:') ? 'Đã tải lên file ảnh' : (q.imageUrl || '')} 
                                                                                    onChange={e => updateQuestion(si, qi, 'imageUrl', e.target.value)}
                                                                                    disabled={q.imageUrl && q.imageUrl.startsWith('data:')}
                                                                                    placeholder="Nhập đường dẫn hoặc tải lên..." 
                                                                                    className="flex-1 px-3 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none" 
                                                                                />
                                                                                <label className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 select-none">
                                                                                    Tải lên
                                                                                    <input 
                                                                                        type="file" 
                                                                                        accept="image/*" 
                                                                                        onChange={e => handleImageUpload(si, qi, e.target.files[0])} 
                                                                                        className="hidden" 
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                            {q.imageUrl && (
                                                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                                                    <div className="h-10 w-16 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                                                                        <img src={q.imageUrl} alt="Preview" className="h-full w-full object-contain" />
                                                                                    </div>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => updateQuestion(si, qi, 'imageUrl', '')} 
                                                                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Các phương án lựa chọn (Chỉ hiện khi không có câu hỏi phụ) */}
                                                                {(!q.subQuestions || q.subQuestions.length === 0) && (
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Các phương án trả lời & Tích chọn đáp án đúng</label>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                            {q.options.map((opt, oi) => (
                                                                                <div key={oi} className="flex items-center gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => updateQuestion(si, qi, 'correctAnswer', oi)}
                                                                                        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer ${q.correctAnswer === oi
                                                                                            ? 'bg-green-500 text-white ring-2 ring-green-150'
                                                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                                                                                            }`}
                                                                                    >
                                                                                        {String.fromCharCode(65 + oi)}
                                                                                    </button>
                                                                                    <div className="flex-1 space-y-1">
                                                                                        <input type="text" value={opt} onChange={e => updateOption(si, qi, oi, e.target.value)}
                                                                                            placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                                                                                            className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-japanese" />
                                                                                        {opt && (
                                                                                            <div className="px-2.5 py-1 text-xs md:text-sm font-japanese text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line bg-slate-100/40 dark:bg-slate-900/20 rounded-lg border border-slate-200/40 dark:border-slate-800/30" dangerouslySetInnerHTML={{ __html: opt }} />
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Giải thích câu hỏi (Chỉ hiện khi không có câu hỏi phụ) */}
                                                                {(!q.subQuestions || q.subQuestions.length === 0) && (
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giải thích chi tiết (Dành cho phần xem lại đề)</label>
                                                                        <input type="text" value={q.explanation || ''} onChange={e => updateQuestion(si, qi, 'explanation', e.target.value)}
                                                                            placeholder="Giải thích ngữ pháp hoặc dịch từ vựng..."
                                                                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none" />
                                                                        {q.explanation && (
                                                                            <div className="mt-1.5 p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
                                                                                <span className="block text-[9px] font-bold text-[#2E5B70] dark:text-sky-400 uppercase tracking-wider mb-1">Xem trước giải thích:</span>
                                                                                <div className="text-sm italic leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: `💡 ${q.explanation}` }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {/* Sub-questions Section */}
                                                                <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                                            Câu hỏi phụ ({q.subQuestions?.length || 0})
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const sqs = q.subQuestions ? [...q.subQuestions] : [];
                                                                                sqs.push({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
                                                                                updateQuestion(si, qi, 'subQuestions', sqs);
                                                                            }}
                                                                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi phụ
                                                                        </button>
                                                                    </div>
                                                                    {q.subQuestions && q.subQuestions.length > 0 ? (
                                                                        <div className="space-y-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-850">
                                                                            {q.subQuestions.map((sq, sqi) => (
                                                                                <div key={sqi} className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800/60 space-y-3 shadow-sm">
                                                                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                                                                                        <span className="text-[11px] font-bold text-slate-500">Câu hỏi phụ #{sqi + 1}</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const sqs = q.subQuestions.filter((_, idx) => idx !== sqi);
                                                                                                updateQuestion(si, qi, 'subQuestions', sqs);
                                                                                            }}
                                                                                            className="p-1 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                                                                                        >
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nội dung câu hỏi phụ</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={sq.question}
                                                                                            onChange={(e) => {
                                                                                                const sqs = [...q.subQuestions];
                                                                                                sqs[sqi] = { ...sqs[sqi], question: e.target.value };
                                                                                                updateQuestion(si, qi, 'subQuestions', sqs);
                                                                                            }}
                                                                                            placeholder="VD: Câu hỏi (1) hoặc điền từ vào chỗ trống..."
                                                                                            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/45 text-slate-800 dark:text-white outline-none font-japanese"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Các phương án trả lời & Chọn đáp án đúng</label>
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                                            {sq.options.map((opt, oi) => (
                                                                                                <div key={oi} className="flex items-center gap-1.5">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const sqs = [...q.subQuestions];
                                                                                                            sqs[sqi] = { ...sqs[sqi], correctAnswer: oi };
                                                                                                            updateQuestion(si, qi, 'subQuestions', sqs);
                                                                                                        }}
                                                                                                        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${sq.correctAnswer === oi
                                                                                                            ? 'bg-green-500 text-white ring-1 ring-green-150'
                                                                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-650 dark:text-slate-400 hover:bg-slate-350'
                                                                                                            }`}
                                                                                                    >
                                                                                                        {String.fromCharCode(65 + oi)}
                                                                                                    </button>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={opt}
                                                                                                        onChange={(e) => {
                                                                                                            const sqs = [...q.subQuestions];
                                                                                                            const newOpts = [...sqs[sqi].options];
                                                                                                            newOpts[oi] = e.target.value;
                                                                                                            sqs[sqi] = { ...sqs[sqi], options: newOpts };
                                                                                                            updateQuestion(si, qi, 'subQuestions', sqs);
                                                                                                        }}
                                                                                                        placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                                                                                                        className="flex-1 px-2.5 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/45 text-slate-800 dark:text-white outline-none font-japanese"
                                                                                                    />
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giải thích câu hỏi phụ</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={sq.explanation || ''}
                                                                                            onChange={(e) => {
                                                                                                const sqs = [...q.subQuestions];
                                                                                                sqs[sqi] = { ...sqs[sqi], explanation: e.target.value };
                                                                                                updateQuestion(si, qi, 'subQuestions', sqs);
                                                                                            }}
                                                                                            placeholder="Giải thích vì sao chọn đáp án này..."
                                                                                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/45 text-slate-800 dark:text-white outline-none"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-3">Không có câu hỏi phụ. Câu hỏi này sẽ được chấm điểm trực tiếp.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => addQuestion(si)}
                                                        className="w-full py-2.5 text-xs font-bold text-[#2E5B70] dark:text-sky-400 border-2 border-dashed border-[#2E5B70]/20 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/10 transition flex items-center justify-center gap-1 cursor-pointer">
                                                        <Plus className="w-4 h-4" /> Thêm câu hỏi mới cho phần này
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Thao tác lưu / Hủy */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-3 bg-[#2E5B70] text-white rounded-xl font-bold hover:bg-[#254A5C] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingTest ? 'Lưu cập nhật thay đổi' : 'Lưu và xuất bản đề thi'}
                            </button>
                            {editingTest && (
                                <button onClick={resetForm} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer">
                                    Hủy bỏ sửa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {/* Danh sách đề thi hiện có */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h2 className="font-extrabold text-slate-800 dark:text-white text-sm md:text-base">
                                📋 Danh sách đề thi & bài luyện hiện có ({filteredTests.length})
                            </h2>
                            {/* Search bar */}
                            <div className="relative max-w-xs w-full">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm tên đề thi, cấp độ..."
                                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category filtering section */}
                        <div className="flex flex-wrap items-center gap-4 text-xs pt-3 border-t border-slate-150 dark:border-slate-700/60">
                            {/* Level tabs */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-400 mr-1">Cấp độ:</span>
                                {['All', 'N1', 'N2', 'N3', 'N4', 'N5'].map((lvl) => (
                                    <button
                                        key={lvl}
                                        onClick={() => setSelectedLevelFilter(lvl)}
                                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                            selectedLevelFilter === lvl
                                                ? 'bg-[#2E5B70] text-white shadow-sm'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {lvl === 'All' ? 'Tất cả' : lvl}
                                    </button>
                                ))}
                            </div>

                            {/* Separator on desktop */}
                            <div className="hidden md:block h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                            {/* Type tabs */}
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 mr-1">Phân loại:</span>
                                {[
                                    { value: 'All', label: 'Tất cả' },
                                    { value: 'full', label: 'Đề thi thử' },
                                    { value: 'skill', label: 'Luyện kỹ năng' }
                                ].map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => setSelectedTypeFilter(t.value)}
                                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                            selectedTypeFilter === t.value
                                                ? 'bg-[#2E5B70] text-white shadow-sm'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {tests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-medium">Chưa có đề thi nào trong hệ thống. Hãy tạo đề thi đầu tiên!</p>
                            </div>
                        ) : filteredTests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                                <p className="text-xs font-medium">Không tìm thấy đề thi/bài luyện nào khớp với bộ lọc hiện tại.</p>
                            </div>
                        ) : filteredTests.map(test => {
                            const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                            const levelColors = {
                                N5: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/55',
                                N4: 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-100/55',
                                N3: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/55',
                                N2: 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border border-violet-100/55',
                                N1: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/55',
                            };
                            return (
                                <div key={test.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/10 transition flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${levelColors[test.level] || ''}`}>
                                            {test.level}
                                        </span>
                                        <div>
                                            <p className="font-extrabold text-slate-800 dark:text-white text-xs">{test.title}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
                                                <span>{totalQ} câu hỏi</span>
                                                <span>•</span>
                                                <span>{test.timeLimit} phút</span>
                                                <span>•</span>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${test.isSkillTest ? 'bg-sky-50 dark:bg-sky-950/25 text-sky-600' : 'bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600'}`}>
                                                    {test.isSkillTest ? `Luyện kỹ năng: ${SKILL_LABELS[test.skillType] || test.skillType}` : 'Đề thi thử đầy đủ'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleEdit(test)} className="p-2 text-[#2E5B70] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setConfirmDelete(test)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* JSON Import Modal */}
            {showJsonImport && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Import đề thi / bài luyện từ cấu trúc JSON</h3>
                            <button onClick={() => setShowJsonImport(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        {/* Selector for Import Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Loại đề nhập vào</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setImportType('full')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${importType === 'full' 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Đề thi đầy đủ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImportType('skill')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${importType === 'skill' 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Luyện chuyên sâu
                                    </button>
                                </div>
                            </div>
                            {importType === 'skill' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Kỹ năng chuyên sâu</label>
                                    <select 
                                        value={importSkillType} 
                                        onChange={e => setImportSkillType(e.target.value)}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none"
                                    >
                                        {Object.entries(SKILL_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        {/* Selector for Import Method */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phương thức nhập (Import Method)</label>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                    <input 
                                        type="radio" 
                                        name="importMethod" 
                                        value="overwrite" 
                                        checked={importMethod === 'overwrite'} 
                                        onChange={() => setImportMethod('overwrite')}
                                        className="accent-[#2E5B70] w-4 h-4" 
                                    />
                                    Ghi đè hoàn toàn (Làm mới nội dung)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                    <input 
                                        type="radio" 
                                        name="importMethod" 
                                        value="append" 
                                        checked={importMethod === 'append'} 
                                        onChange={() => setImportMethod('append')}
                                        className="accent-[#2E5B70] w-4 h-4" 
                                    />
                                    Bổ sung câu hỏi (Thêm vào phần hiện có)
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                {importMethod === 'overwrite' 
                                    ? '⚠️ Lưu ý: Phương thức ghi đè sẽ xóa toàn bộ các câu hỏi đang nhập trong biểu mẫu hiện tại và thay thế bằng dữ liệu trong file JSON.' 
                                    : '💡 Gợi ý: Hữu ích khi đề thi quá dài. Bạn có thể chia đề thi thành nhiều file JSON nhỏ để nhập bổ sung từng phần.'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 dark:border-slate-800/80 pb-2">
                                <span className="text-[11px] text-slate-500 font-bold">Cấu trúc Lồng nhau (Nested JSON):</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const sample = importType === 'full' 
                                                ? SAMPLE_FULL_JSON 
                                                : getSampleJsonForSkill(importSkillType);
                                            navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                                            notify('success', 'Đã copy JSON mẫu lồng nhau vào Clipboard!');
                                        }}
                                        className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-650 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer select-none"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Sao chép mẫu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const sample = importType === 'full' 
                                                ? SAMPLE_FULL_JSON 
                                                : getSampleJsonForSkill(importSkillType);
                                            setJsonInput(JSON.stringify(sample, null, 2));
                                            notify('success', 'Đã nạp JSON mẫu lồng nhau!');
                                        }}
                                        className="px-2.5 py-1.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition cursor-pointer select-none"
                                    >
                                        Nạp vào ô nhập
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <span className="text-[11px] text-slate-500 font-bold">Cấu trúc Dạng phẳng (Flat Decimal 1.1, 1.2):</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(SAMPLE_FLAT_JSON, null, 2));
                                            notify('success', 'Đã copy JSON mẫu dạng phẳng vào Clipboard!');
                                        }}
                                        className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-650 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer select-none"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Sao chép mẫu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setJsonInput(JSON.stringify(SAMPLE_FLAT_JSON, null, 2));
                                            notify('success', 'Đã nạp JSON mẫu dạng phẳng!');
                                        }}
                                        className="px-2.5 py-1.5 text-[10px] font-bold bg-sky-50 dark:bg-sky-950/30 text-[#2E5B70] dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-xl transition cursor-pointer select-none"
                                    >
                                        Nạp vào ô nhập
                                    </button>
                                </div>
                            </div>
                        </div>
                        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                            placeholder="Dán mã JSON đề thi vào đây..." rows={10}
                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none resize-none font-mono" />
                        <div className="flex gap-3">
                            <button onClick={handleJsonImport} className="flex-1 py-2.5 bg-[#2E5B70] text-white rounded-xl font-bold hover:bg-[#254A5C] transition cursor-pointer text-xs">
                                Tiến hành Import
                            </button>
                            <button onClick={() => setShowJsonImport(false)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-bold text-xs cursor-pointer">
                                Hủy bỏ
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Xác nhận xóa */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100 dark:border-slate-700">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Bạn thực sự muốn xóa?</h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Đề thi <strong>{confirmDelete.title}</strong> sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu và không thể khôi phục lại.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer">Hủy bỏ</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                                <Trash2 className="w-4 h-4" /> Đồng ý Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Thông báo góc màn hình */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce text-xs font-bold text-white ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{notification.message}</span>
                </div>
            )}
        </div>
    );
};
export default JLPTAdminScreen;
