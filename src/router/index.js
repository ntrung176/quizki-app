// Route configuration - centralized route definitions
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    PAYMENT: '/payment',
    ACCOUNT: '/account',
    HELP: '/help',
    VOCABULARY: '/vocabulary',
    VOCABULARY_ADD: '/vocabulary/add',
    VOCABULARY_EDIT: '/vocabulary/edit/:id',
    REVIEW: '/review',
    STUDY: '/study',
    TEST: '/test',
    STATS: '/stats',
    FRIENDS: '/friends',
    IMPORT: '/import',
};

// Helper function to generate edit route with ID
export const getEditRoute = (cardId) => `/vocabulary/edit/${cardId}`;

// Re-export react-router-dom hooks and components for convenience
export { useNavigate, useParams, useLocation, Navigate, Link } from 'react-router-dom';
