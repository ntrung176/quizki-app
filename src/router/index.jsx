import React from 'react';
import { Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';

// Route configuration - centralized route definitions
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    ACCOUNT: '/account',
    HELP: '/help',
    VOCABULARY: '/vocabulary',
    VOCABULARY_ADD: '/vocabulary/add',
    VOCABULARY_EDIT: '/vocabulary/edit/:id',
    REVIEW: '/review',
    FLASHCARD: '/flashcard',
    KANJI: '/kanji',
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
// isApproved is kept as prop for potential future use but not checked for routing
export const ProtectedRoute = ({ children, isAuthenticated, isApproved }) => {
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
