import React from 'react';
import type { GlobalShiftParams } from '../../types';
import { AlertCircle } from 'lucide-react';

interface Props {
    params: GlobalShiftParams;
    onChange: (params: GlobalShiftParams) => void;
}

export function GlobalShiftSettings({ params, onChange }: Props) {
    const handleChange = (key: keyof GlobalShiftParams, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return; // Or handle empty string

        const newParams = { ...params, [key]: numValue };

        // Auto-balance ratios if one changes? 
        // User requirement: "Ratio Check: Travel Ratio + Direct Ratio must equal 100%".
        // It doesn't explicitly say auto-balance, but it's good UX.
        // Let's implement validation first, maybe auto-balance if requested. 
        // For now, simple raw input with validation error.

        onChange(newParams);
    };

    const totalRatio = (params.pickingTravelRatio + params.pickingDirectRatio).toFixed(2);
    const isValidRatio = Math.abs(parseFloat(totalRatio) - 1.0) < 0.01;

    return (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-[#111418] rounded-lg border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Global Shift Parameters</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Standard Shift Duration (Hours)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={params.standardShiftDurationHours}
                        onChange={(e) => handleChange('standardShiftDurationHours', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Break Threshold (Seconds)</label>
                    <input
                        type="number"
                        step="10"
                        value={params.breakThresholdSec}
                        onChange={(e) => handleChange('breakThresholdSec', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Picking Travel Ratio (0-1)</label>
                    <input
                        type="number"
                        step="0.05"
                        max="1"
                        min="0"
                        value={params.pickingTravelRatio}
                        onChange={(e) => handleChange('pickingTravelRatio', e.target.value)}
                        className={`w-full px-3 py-2 border rounded text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 outline-none ${!isValidRatio ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-800 focus:ring-blue-500'}`}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Picking Direct Ratio (0-1)</label>
                    <input
                        type="number"
                        step="0.05"
                        max="1"
                        min="0"
                        value={params.pickingDirectRatio}
                        onChange={(e) => handleChange('pickingDirectRatio', e.target.value)}
                        className={`w-full px-3 py-2 border rounded text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 outline-none ${!isValidRatio ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-800 focus:ring-blue-500'}`}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Smoothing Tolerance (Seconds)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={params.smoothingToleranceSec}
                        onChange={(e) => handleChange('smoothingToleranceSec', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {!isValidRatio && (
                <div className="flex items-center gap-2 text-rose-600 text-xs mt-2 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    <span>Ratio Mismatch: Sum is {totalRatio}, must be 1.00</span>
                </div>
            )}
        </div>
    );
}
