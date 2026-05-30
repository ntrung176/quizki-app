import { BookOpen, Plus, List, Library, Languages, Star } from 'lucide-react';
import { ROUTES } from '../router';

export const VOCAB_TABS = [
    { id: 'vocab-review', label: 'Ôn tập', icon: BookOpen, route: ROUTES.VOCAB_REVIEW, exact: true },
    { id: 'vocab-list', label: 'Thư viện', icon: List, route: ROUTES.VOCAB_LIST, exact: true },
    { id: 'vocab-add', label: 'Thêm học phần', icon: Plus, route: ROUTES.VOCAB_ADD, exact: true },
    { id: 'vocab-books', label: 'Học theo sách', icon: Library, route: ROUTES.BOOKS, exact: true },
];

export const KANJI_TABS = [
    { id: 'kanji-study', label: 'Bài học', icon: Languages, route: ROUTES.KANJI_STUDY, exact: false },
    { id: 'kanji-review', label: 'Ôn tập', icon: BookOpen, route: ROUTES.KANJI_REVIEW, exact: true },
    { id: 'kanji-saved', label: 'Đã lưu', icon: Star, route: ROUTES.KANJI_SAVED, exact: true },
    { id: 'kanji-list', label: 'Tra cứu', icon: List, route: ROUTES.KANJI_LIST, exact: false },
];

