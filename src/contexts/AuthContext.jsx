import React, { createContext, useContext } from 'react';
import { useAuthSession } from '../hooks/useAuthSession';

const AuthContext = createContext(null);

export const AuthProvider = ({ children, setNotification, setAllCards, setReviewCards, setView, setEditingCard }) => {
    const authSession = useAuthSession({
        setNotification,
        setAllCards,
        setReviewCards,
        setView,
        setEditingCard
    });

    return (
        <AuthContext.Provider value={authSession}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
