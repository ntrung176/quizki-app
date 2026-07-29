import React, { createContext, useContext } from 'react';
import { useStudySets } from '../hooks/useStudySets';

const StudySetsContext = createContext(null);

export const StudySetsProvider = ({
    children,
    userId,
    authReady,
    allCards,
    profile,
    hasPremium,
    targetLanguage,
    setNotification
}) => {
    const studySetsData = useStudySets({
        userId,
        authReady,
        allCards,
        profile,
        hasPremium,
        targetLanguage,
        setNotification
    });

    return (
        <StudySetsContext.Provider value={studySetsData}>
            {children}
        </StudySetsContext.Provider>
    );
};

export const useStudySetsContext = () => {
    const context = useContext(StudySetsContext);
    if (!context) {
        throw new Error('useStudySetsContext must be used within a StudySetsProvider');
    }
    return context;
};

export default StudySetsContext;
