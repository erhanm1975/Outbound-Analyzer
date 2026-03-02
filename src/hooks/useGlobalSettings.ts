import { useState, useCallback, useEffect } from 'react';
import type { BufferConfig } from '../types';

const STORAGE_KEY = 'jobAnalyzerGlobalSettings';

/**
 * Manages the flat "Global Settings" properties (like smoothingTolerance, breakThreshold, etc.)
 * in localStorage, keeping them distinct from the backend JSON engineered standards.
 */
export const useGlobalSettings = (defaultConfig: BufferConfig) => {
    const [settings, setSettings] = useState<BufferConfig>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Loaded from localStorage
                return { ...defaultConfig, ...parsed };
            }
        } catch (e) {
            console.error('[GlobalSettings] ❌ Failed to parse settings from localStorage', e);
        }
        return defaultConfig;
    });

    const updateGlobalSettings = useCallback((newSettings: Partial<BufferConfig>) => {
        setSettings(prev => {
            // Strip out engineered standards to ensure we only save flat config fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { engineeredStandards, ...flatConfig } = { ...prev, ...newSettings };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(flatConfig));
                // Saved flat config to localStorage
            } catch (e) {
                console.error('[GlobalSettings] ❌ Failed to save settings to localStorage', e);
            }
            return { ...prev, ...newSettings };
        });
    }, []);

    const resetGlobalSettings = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            // Cleared localStorage
        } catch (e) {
            console.error('[GlobalSettings] ❌ Failed to clear localStorage', e);
        }
        setSettings(defaultConfig);
    }, [defaultConfig]);

    return {
        settings,
        updateGlobalSettings,
        resetGlobalSettings
    };
};
