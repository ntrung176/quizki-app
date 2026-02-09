import React from 'react';
import { Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';

// Route configuration - centralized route definitions
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    ACCOUNT: '/account',
    HELP: '/help',
    // Vocabulary routes
    VOCABULARY: '/srsvocab',         // Ôn tập từ vựng (trang chủ cũ)
    VOCABULARY_LIST: '/vocabulary',   // Danh sách từ vựng
    VOCABULARY_ADD: '/addvocab',      // Thêm từ vựng mới (tách riêng)
    VOCABULARY_EDIT: '/vocabulary/edit/:id',
    // Kanji routes
    KANJI_STUDY: '/kanji-study',      // Học Kanji (lộ trình)
    KANJI_REVIEW: '/kanji-review',    // Ôn tập Kanji (mới)
    KANJI_LIST: '/kanji',             // Danh sách Kanji
    KANJI: '/kanji',                  // Alias for compatibility
    // Other routes
    REVIEW: '/review',
    FLASHCARD: '/flashcard',
    STUDY: '/study',
    TEST: '/test',
    STATS: '/stats',
    FRIENDS: '/friends',
    IMPORT: '/import',
    ADMIN: '/admin',
};

// Helper function to generate edit route with ID
export const getEditRoute = (cardId) => `/vocabulary/edit/${cardId}`;

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
