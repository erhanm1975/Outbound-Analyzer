import { useState, useCallback, useEffect, useRef } from 'react';
import customizedStandardsData from '../data/customized-engineered-standards.json';
import type { BufferConfig } from '../types';

export const useEngineeredStandards = (defaultConfig: BufferConfig) => {
    const [config, setConfig] = useState<BufferConfig>(() => {
        return {
            ...defaultConfig,
            engineeredStandards: customizedStandardsData
        } as BufferConfig;
    });

    // Keep a ref that always points to the LATEST config so callbacks never go stale
    const configRef = useRef(config);
    useEffect(() => { configRef.current = config; }, [config]);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Fetch fresh data on mount to bypass Vite's stale static import cache
    useEffect(() => {
        const t = Date.now();
        console.log('[Standards] 🔄 Fetching fresh customized data on mount...');
        fetch(`/api/standards/customized?_t=${t}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(freshData => {
                if (freshData && freshData.cards) {
                    const sample = freshData.cards[0]?.activities?.[0];
                    console.log('[Standards] ✅ Mount fetch OK. Sample:', sample?.name, '=', sample?.defaultSeconds);
                    setConfig(prev => ({
                        ...prev,
                        engineeredStandards: freshData
                    } as BufferConfig));
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
            console.log(`[Standards] 📤 POST ${endpoint}...`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            console.log(`[Standards] ✅ POST ${endpoint} result:`, result);

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
        console.log(`[Standards] 📥 GET ${url}...`);
        const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);
        const data = await res.json();
        const sample = data.cards?.[0]?.activities?.[0];
        console.log(`[Standards] ✅ GET ${endpoint} OK. Sample:`, sample?.name, '=', sample?.defaultSeconds);
        return data;
    };

    /**
     * Standard UI update flow: Takes entire new config, updates local React state immediately,
     * then pushes the `engineeredStandards` portion to the customized REST endpoint.
     */
    const updateStandards = useCallback(async (newConfig: BufferConfig) => {
        const sample = (newConfig.engineeredStandards as any)?.cards?.[0]?.activities?.[0];
        console.log('[Standards] 💾 Save triggered. Sample:', sample?.name, '=', sample?.defaultSeconds);
        setConfig(newConfig); // Immediate optimistic UI update
        await saveToServer('/api/standards/customized', newConfig.engineeredStandards);
    }, []);

    /**
     * Sync Buttons
     */

    // "Restore Baseline" — fetch the LATEST global file FROM DISK and apply it
    const restoreGlobalDefaults = useCallback(async () => {
        try {
            console.log('[Standards] 🔵 RESTORE BASELINE clicked');

            // Always read directly from disk — never trust React state or imports
            const freshGlobalData = await fetchFreshFromDisk('/api/standards/global');

            const newConfig = {
                ...configRef.current,
                engineeredStandards: freshGlobalData
            } as BufferConfig;

            setConfig(newConfig);

            // Also overwrite the customized file so it stays in sync
            await saveToServer('/api/standards/customized', freshGlobalData);
            console.log('[Standards] ✅ RESTORE BASELINE complete');
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
            console.log('[Standards] 🟢 PUSH TO GLOBAL clicked');

            // Always read the latest customized data FROM DISK — never trust React state
            const freshCustomizedData = await fetchFreshFromDisk('/api/standards/customized');

            await saveToServer('/api/standards/global', freshCustomizedData);
            console.log('[Standards] ✅ PUSH TO GLOBAL complete');
            alert('Global baseline has been permanently updated with your custom definitions.');
        } catch (e) {
            console.error('[Standards] ❌ PUSH ERROR:', e);
            alert('Failed to push to global baseline. Check browser console for details.');
        }
    }, []);

    return {
        config,
        updateStandards,
        restoreGlobalDefaults,
        pushCustomizedToGlobal,
        isSaving,
        saveStatus
    };
};
