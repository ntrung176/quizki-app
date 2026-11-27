import { useState, useEffect, useCallback } from 'react';
import {
    getCurrentAiCredits,
    getFeatureCreditCost,
    canAffordFeature
} from '../utils/aiCreditManager';

/**
 * Subscribe reactively to live AI credit balance updates across all components.
 */
export const useAiCredits = () => {
    const [creditsState, setCreditsState] = useState(() => getCurrentAiCredits());

    useEffect(() => {
        setCreditsState(getCurrentAiCredits());

        const handleUpdate = (e) => {
            if (e?.detail) {
                setCreditsState({ ...e.detail });
            } else {
                setCreditsState(getCurrentAiCredits());
            }
        };

        window.addEventListener('quizki-ai-credits-updated', handleUpdate);
        return () => window.removeEventListener('quizki-ai-credits-updated', handleUpdate);
    }, []);

    const checkAfford = useCallback((featureId) => {
        return canAffordFeature(featureId);
    }, [creditsState]);

    return {
        ...creditsState,
        getCost: getFeatureCreditCost,
        checkAfford
    };
};

export default useAiCredits;
