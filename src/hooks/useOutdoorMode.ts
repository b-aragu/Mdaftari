/**
 * Outdoor Mode Hook
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mdaftari-outdoor-mode';

export function useOutdoorMode() {
    const [isOutdoorMode, setIsOutdoorMode] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-outdoor', String(isOutdoorMode));

        try {
            localStorage.setItem(STORAGE_KEY, String(isOutdoorMode));
        } catch {
            // localStorage might not be available
        }
    }, [isOutdoorMode]);

    const toggleOutdoorMode = useCallback(() => {
        setIsOutdoorMode(prev => !prev);
    }, []);

    const enableOutdoorMode = useCallback(() => {
        setIsOutdoorMode(true);
    }, []);

    const disableOutdoorMode = useCallback(() => {
        setIsOutdoorMode(false);
    }, []);

    return {
        isOutdoorMode,
        toggleOutdoorMode,
        enableOutdoorMode,
        disableOutdoorMode,
    };
}
