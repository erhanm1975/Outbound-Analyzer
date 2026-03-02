import { useState, useCallback, useEffect, useRef } from 'react';
import customizedStandardsData from '../data/customized-engineered-standards.json';
import type { BufferConfig, EngineeredStandardsConfig } from '../types';

export const useEngineeredStandards = () => {
    const [standards, setStandards] = useState<EngineeredStandardsConfig | undefined>(() => {
        return customizedStandardsData as EngineeredStandardsConfig;
    });

    // Keep a ref that always points to the LATEST config so callbacks never go stale
    const configRef = useRef(standards);
    useEffect(() => { configRef.current = standards; }, [standards]);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Fetch fresh data on mount to bypass Vite's stale static import cache
    useEffect(() => {
        const t = Date.now();

        fetch(`/api/standards/customized?_t=${t}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(freshData => {
                if (freshData && freshData.cards) {
                    const sample = freshData.cards[0]?.activities?.[0];
                    // Fetch OK
                    setStandards(freshData as EngineeredStandardsConfig);
                } else {
                    console.warn('[Standards] ⚠️ Fetched data has no cards! Got:', Object.keys(freshData));
                }
            })
            .catch(err => console.warn('[Standards] ❌ Mount fetch failed:', err));
    }, []);

    const saveToServer = async (endpoint: string, payload: any): Promise<boolean> => {
        try {
            setIsSaving(true);
            setSaveStatus('saving');
            // POST request
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            // Successfully saved

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
            return true;
        } catch (e) {
            console.error('[Standards] ❌ POST failed:', e);
            setSaveStatus('error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Fetch the freshest copy of a standards file directly from disk,
     * bypassing React state, Vite HMR, AND browser cache entirely.
     */
    const fetchFreshFromDisk = async (endpoint: string): Promise<any> => {
        const url = `${endpoint}?_t=${Date.now()}`;
        // Fetch request
        const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);
        const data = await res.json();
        const sample = data.cards?.[0]?.activities?.[0];
        // Fetch OK
        return data;
    };

    /**
     * Standard UI update flow: Takes the full frontend model config, extracts the standards JSON tree,
     * updates local React state immediately, then pushes the `engineeredStandards` portion to the REST endpoint.
     */
    const updateStandards = useCallback(async (newConfig: BufferConfig) => {
        const std = newConfig.engineeredStandards;
        if (!std) return;
        const sample = (std as any)?.cards?.[0]?.activities?.[0];
        // Trigger save
        setStandards(std); // Immediate optimistic UI update
        await saveToServer('/api/standards/customized', std);
    }, []);

    /**
     * Sync Buttons
     */

    // "Restore Baseline" — fetch the LATEST global file FROM DISK and apply it
    const restoreGlobalDefaults = useCallback(async () => {
        try {
            // Restore Baseline

            // Always read directly from disk — never trust React state or imports
            const freshGlobalData = await fetchFreshFromDisk('/api/standards/global');

            setStandards(freshGlobalData as EngineeredStandardsConfig);

            // Also overwrite the customized file so it stays in sync
            await saveToServer('/api/standards/customized', freshGlobalData);
            // Complete
            alert('Customized standards have been successfully reset to match the Global Baseline.');
        } catch (e) {
            console.error('[Standards] ❌ RESTORE ERROR:', e);
            alert('Failed to restore from global baseline. Check browser console for details.');
        }
    }, []);

    // "Push to Global Baseline" — read latest customized FROM DISK, then write it as global
    const pushCustomizedToGlobal = useCallback(async () => {
        const confirmPush = window.confirm("Are you sure you want to overwrite the GLOBAL standard baseline with your currently customized values? This affects everyone.");
        if (!confirmPush) return;

        try {
            // Push to Global

            // Always read the latest customized data FROM DISK — never trust React state
            const freshCustomizedData = await fetchFreshFromDisk('/api/standards/customized');

            await saveToServer('/api/standards/global', freshCustomizedData);
            // Complete
            alert('Global baseline has been permanently updated with your custom definitions.');
        } catch (e) {
            console.error('[Standards] ❌ PUSH ERROR:', e);
            alert('Failed to push to global baseline. Check browser console for details.');
        }
    }, []);

    return {
        standards,
        updateStandards,
        restoreGlobalDefaults,
        pushCustomizedToGlobal,
        isSaving,
        saveStatus
    };
};
