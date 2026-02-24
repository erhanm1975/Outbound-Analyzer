import React from 'react';
import type { CalculationCard, MicroActivity } from '../../types';
import { Clock, Calculator } from 'lucide-react';

interface Props {
    cards: CalculationCard[];
    onChange: (cards: CalculationCard[]) => void;
}

export function EngineeredStandardsSettings({ cards, onChange }: Props) {
    const handleActivityChange = (cardIndex: number, activityIndex: number, field: keyof MicroActivity, value: any) => {
        const newCards = [...cards];
        const card = { ...newCards[cardIndex] };
        const activities = [...card.activities];

        activities[activityIndex] = {
            ...activities[activityIndex],
            [field]: value
        };

        card.activities = activities;

        // Recalculate totals
        // Logic: Group by 'bucket' (variable name) and sum defaultSeconds AND targetSeconds
        const defaultMap = new Map<string, number>();
        const targetMap = new Map<string, number>();

        activities.forEach(act => {
            const bucket = act.bucket;

            const currentDefault = defaultMap.get(bucket) || 0;
            defaultMap.set(bucket, currentDefault + (Number(act.defaultSeconds) || 0));

            const currentTarget = targetMap.get(bucket) || 0;
            // Fallback to defaultSeconds if targetSeconds is undefined
            const targetVal = act.targetSeconds !== undefined ? Number(act.targetSeconds) : (Number(act.defaultSeconds) || 0);
            targetMap.set(bucket, currentTarget + targetVal);
        });

        // Update variables in card
        if (card.variables) {
            card.variables = card.variables.map(v => ({
                ...v,
                value: defaultMap.get(v.name) ?? v.value,
                targetValue: targetMap.get(v.name) ?? v.targetValue ?? v.value // Update if found, else keep
            }));
        }

        newCards[cardIndex] = card;
        onChange(newCards);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Engineered Standards (Calculation Groups)</h3>
            <div className="grid grid-cols-1 gap-6">
                {cards.map((card, cardIndex) => (
                    <div key={card.id} className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h4 className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-blue-500" />
                                {card.title}
                            </h4>
                            <div className="flex gap-4">
                                {card.variables.map(v => (
                                    <div key={v.name} className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{v.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-slate-400">Default</span>
                                                <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">{v.value}s</span>
                                            </div>
                                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-blue-500 font-medium">Target</span>
                                                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{v.targetValue ?? v.value}s</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Micro-Activity</th>
                                        <th className="px-4 py-2 text-left font-medium">Bucket (Variable)</th>
                                        <th className="px-4 py-2 text-right font-medium">Default (s)</th>
                                        <th className="px-4 py-2 text-right font-medium text-blue-600 dark:text-blue-400">Target (s)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {card.activities.map((act, actIdx) => (
                                        <tr key={act.name} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">{act.name}</div>
                                                {act.group && <div className="text-[10px] text-slate-400 dark:text-slate-500">{act.group}</div>}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    {act.bucket}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right w-32">
                                                <div className="flex justify-end items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={act.defaultSeconds}
                                                        onChange={(e) => handleActivityChange(cardIndex, actIdx, 'defaultSeconds', parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-1 text-right text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                    />
                                                    <span className="text-xs text-slate-400 w-4">s</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right w-32">
                                                <div className="flex justify-end items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={act.targetSeconds ?? act.defaultSeconds}
                                                        onChange={(e) => handleActivityChange(cardIndex, actIdx, 'targetSeconds', parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-1 text-right text-sm border border-blue-200 dark:border-blue-900/50 rounded bg-blue-50/50 dark:bg-blue-900/20 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 dark:text-blue-100 font-medium placeholder-blue-300"
                                                    />
                                                    <span className="text-xs text-blue-400 w-4">s</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
