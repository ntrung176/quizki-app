import { BookOpen, Plus, List, BookMarked, Languages, Heart, Bookmark, LayoutGrid, Brain } from 'lucide-react';
import { ROUTES } from '../router';

export const VOCAB_TABS = [
    { id: 'vocab-review', label: 'Ôn tập', icon: BookOpen, route: ROUTES.VOCAB_REVIEW, exact: true },
    { id: 'vocab-list', label: 'Thư viện', icon: List, route: ROUTES.VOCAB_LIST, exact: true },
    { id: 'vocab-add', label: 'Thêm học phần', icon: Plus, route: ROUTES.VOCAB_ADD, exact: true },
    { id: 'vocab-books', label: 'Giáo trình', icon: BookMarked, route: ROUTES.BOOKS, exact: true },
];

export const KANJI_TABS = [
    { id: 'kanji-review', label: 'Ôn tập', icon: BookOpen, route: ROUTES.KANJI_REVIEW, exact: true },
    { id: 'kanji-study', label: 'Bài học', icon: Languages, route: ROUTES.KANJI_STUDY, exact: false },
    { id: 'kanji-saved', label: 'Đã lưu', icon: Heart, route: ROUTES.KANJI_SAVED, exact: true },
    { id: 'kanji-list', label: 'Tra cứu', icon: List, route: ROUTES.KANJI_LIST, exact: false },
];

export const GRAMMAR_TABS = [
    { id: 'grammar-review', label: 'Ôn tập', icon: BookOpen, route: ROUTES.GRAMMAR_REVIEW, exact: true },
    { id: 'grammar-nuances', label: 'Bản đồ tư duy (752)', icon: Brain, route: ROUTES.GRAMMAR_NUANCES, exact: false },
    { id: 'grammar-curriculum', label: 'Chủ đề', icon: LayoutGrid, route: ROUTES.GRAMMAR_CURRICULUM, exact: false },
    { id: 'grammar-cheatsheets', label: 'Sổ tay chuyên đề', icon: Bookmark, route: ROUTES.GRAMMAR_CHEATSHEETS, exact: false },
    { id: 'grammar-saved', label: 'Đã lưu', icon: Heart, route: ROUTES.GRAMMAR_SAVED, exact: true },
    { id: 'grammar-list', label: 'Tra cứu', icon: List, route: ROUTES.GRAMMAR_LIST, exact: false },
];


