import React from 'react';
import { Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';

// Route configuration - centralized route definitions
// Convention: /<feature>/<action> (e.g. /vocab/list, /kanji/review)
export const ROUTES = {
    // General
    HOME: '/',
    LOGIN: '/login',
    ACCOUNT: '/account',
    HELP: '/help',
    PRIVACY: '/privacy',
    TERMS: '/terms',

    // Vocabulary: /vocab/*
    VOCAB_REVIEW: '/vocab/review',       // Ôn tập từ vựng (SRS flashcard)
    VOCAB_LIST: '/vocab/list',           // Danh sách từ vựng
    VOCAB_ADD: '/vocab/add',             // Thêm từ vựng mới
    VOCAB_EDIT: '/vocab/edit/:id',       // Chỉnh sửa từ vựng

    // Kanji: /kanji/*
    KANJI_STUDY: '/kanji/study',         // Học Kanji (lộ trình)
    KANJI_LESSON: '/kanji/study/lesson', // Bài học Kanji (flashcard + test)
    KANJI_REVIEW: '/kanji/review',       // Ôn tập Kanji (SRS)
    KANJI_SAVED: '/kanji/saved',         // Danh sách Kanji đã lưu
    KANJI_LIST: '/kanji/list',           // Danh sách Kanji (tra cứu)

    // Study & Test (under vocab/review/*)
    REVIEW: '/vocab/review/quiz',
    FLASHCARD: '/vocab/review/flashcard',
    STUDY: '/vocab/review/study',
    TEST: '/vocab/review/test',

    // JLPT Test
    JLPT_TEST: '/jlpt/test',
    JLPT_ADMIN: '/jlpt/admin',

    // Social & Data
    STATS: '/hub/stats',
    LEADERBOARD: '/hub/leaderboard',
    PET: '/hub/pet',
    IMPORT: '/import',
    ADMIN: '/admin',
    BOOKS: '/books',
    SETTINGS: '/settings',
    FEEDBACK: '/feedback',
};

// Helper function to generate edit route with ID
export const getEditRoute = (cardId) => `/vocab/edit/${cardId}`;

// Re-export react-router-dom hooks and components for convenience
export { useNavigate, useParams, useLocation, Navigate, Link };

// Protected Route component - requires authentication only
export const ProtectedRoute = ({ children, isAuthenticated }) => {
    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return children;
};

// Public Only Route component - redirects to home if already authenticated
export const PublicOnlyRoute = ({ children, isAuthenticated }) => {
    if (isAuthenticated) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return children;
};
