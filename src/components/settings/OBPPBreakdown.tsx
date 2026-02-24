import React from 'react';
import { HelpCircle } from 'lucide-react';
import { RichTooltip } from '../rich-tooltip';
import type { EngineeredStandardsConfig } from '../../types';
import { STANDARD_VARIABLE_TYPES } from '../../types';

interface OBPPBreakdownProps {
    config?: EngineeredStandardsConfig;
    onStandardsChange?: (newCards: any[]) => void;
}

export function OBPPBreakdown({ config, onStandardsChange }: OBPPBreakdownProps) {
    if (!config) return <div className="p-4 text-slate-500 text-sm">Loading configuration...</div>;

    // Variables are now derived from activity buckets, so no direct variable editing.
    // We only need to handle Variable Name changes if we want to "rename" the bucket itself, but the user wants to pick from standard types.
    // So actually, we don't need handleVariableChange or handleVariableNameChange anymore in the same way.
    // We need handleActivityBucketChange.

    const handleActivityBucketChange = (cardId: string, actName: string, newBucket: string) => {
        if (!onStandardsChange || !config) return;
        const newCards = config.cards.map(c => {
            if (c.id === cardId) {
                return {
                    ...c,
                    activities: c.activities.map(a => a.name === actName ? { ...a, bucket: newBucket } : a)
                };
            }
            return c;
        });
        onStandardsChange(newCards);
    };

    const handleActivityChange = (cardId: string, actName: string, field: 'defaultSeconds' | 'targetSeconds', newValue: number) => {
        if (!onStandardsChange || !config) return;
        const newCards = config.cards.map(c => {
            if (c.id === cardId) {
                return {
                    ...c,
                    activities: c.activities.map(a => a.name === actName ? { ...a, [field]: newValue } : a)
                };
            }
            return c;
        });
        onStandardsChange(newCards);
    };

    const renderCardTable = (cardId: string, title: string, activityLabel: string, variableLabel: string) => {
        const card = config.cards.find(c => c.id === cardId);
        if (!card) return null;

        // Calculate Totals per Bucket
        const bucketTotals: Record<string, number> = {};
        const bucketTargets: Record<string, number> = {};

        card.activities.forEach(act => {
            bucketTotals[act.bucket] = (bucketTotals[act.bucket] || 0) + act.defaultSeconds;
            const tgt = act.targetSeconds !== undefined ? act.targetSeconds : act.defaultSeconds;
            bucketTargets[act.bucket] = (bucketTargets[act.bucket] || 0) + tgt;
        });

        const totalStandard = Object.values(bucketTotals).reduce((a, b) => a + b, 0);
        const totalTarget = Object.values(bucketTargets).reduce((a, b) => a + b, 0);

        return (
            <div className="space-y-4">
                <h4 className="text-xs font-medium text-slate-700 dark:text-slate-400 uppercase tracking-wider">{title}</h4>

                {/* Variables Section */}
                {/* Variables Section (Read-Only Summary) */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {Object.entries(bucketTotals).map(([b, v]) => (
                        <div key={b} className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-slate-500 font-medium">{b}</label>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">Std:</span>
                                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{v}s</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-blue-400">Tgt:</span>
                                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{bucketTargets[b]}s</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-3 py-2 font-medium">{activityLabel}</th>
                                <th className="px-3 py-2 font-medium text-right">Standard (s)</th>
                                <th className="px-3 py-2 font-medium text-right text-blue-600 dark:text-blue-400">Target (s)</th>
                                <th className="px-3 py-2 font-medium text-right">{variableLabel}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {card.activities.map((act) => (
                                <tr key={act.name}>
                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                        {act.name}
                                        {act.group && <div className="text-[10px] text-slate-400">{act.group}</div>}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number"
                                            className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700 font-mono"
                                            value={act.defaultSeconds}
                                            onChange={(e) => handleActivityChange(cardId, act.name, 'defaultSeconds', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number"
                                            className="w-16 px-1 py-0.5 text-xs text-right border border-blue-200 dark:border-blue-900/50 rounded bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-mono"
                                            value={act.targetSeconds ?? act.defaultSeconds}
                                            onChange={(e) => handleActivityChange(cardId, act.name, 'targetSeconds', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                                        <select
                                            className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-700"
                                            value={act.bucket}
                                            onChange={(e) => {
                                                handleActivityChange(cardId, act.name, 'bucket' as any, e.target.value as any);
                                                handleActivityBucketChange(cardId, act.name, e.target.value);
                                            }}
                                        >
                                            {STANDARD_VARIABLE_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold">
                                <td className="px-3 py-2 text-slate-900 dark:text-slate-100">Total</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">{totalStandard}s</td>
                                <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{totalTarget}s</td>
                                <td className="px-3 py-2 text-right text-slate-500"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-[#111418] rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">OBPP Process Breakdown (Editable)</h3>
                <RichTooltip
                    content={
                        <div className="space-y-2">
                            <p>This breakdown reflects the engineered standards applied to jobs with the "OBPP" (Order Based Pick Pack) flow class.</p>
                            <p><strong>Picking:</strong> Visit-Based (21s).</p>
                            <p><strong>Packing:</strong> Job Overhead (10s) + Order Overhead (32s) + Unit Variable (4s).</p>
                        </div>
                    }
                >
                    <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                </RichTooltip>
            </div>

            <div className="space-y-6">
                {renderCardTable('picking_obpp', '1. Picking (Visit-Based)', 'Activity', 'Variable')}

                {/* 2. Sorting */}
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-400 uppercase tracking-wider">2. Sorting</h4>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                        No Sorting Activity (0s).
                    </div>
                </div>

                {renderCardTable('packing_obpp', '3. Packing (Standard)', 'Activity', 'Variable')}
            </div>
        </div>
    );
}
