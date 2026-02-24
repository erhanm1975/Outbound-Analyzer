import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertTriangle, Save, ArrowRight, Wand2 } from 'lucide-react';
import type { EngineeredStandardsConfig, JobFlowConfig } from '../types';

interface JobTypeMappingModalProps {
    uniqueJobTypes: string[];
    config: EngineeredStandardsConfig;
    existingMapping: Record<string, string>;
    onSave: (mapping: Record<string, string>) => void;
    onClose: () => void;
    isOpen: boolean;
}

export function JobTypeMappingModal({ uniqueJobTypes, config, existingMapping, onSave, onClose, isOpen }: JobTypeMappingModalProps) {
    const [localMapping, setLocalMapping] = useState<Record<string, string>>({});
    const [autoMatchedCounts, setAutoMatchedCounts] = useState(0);

    // Initialize mapping with existing + auto-match
    useEffect(() => {
        if (!isOpen) return;

        const newMapping = { ...existingMapping };
        let matchCount = 0;

        uniqueJobTypes.forEach(rawType => {
            if (newMapping[rawType]) return; // Already mapped

            // Auto-Match Logic
            const lowerRaw = rawType.toLowerCase();
            let bestMatchString = '';

            // 1. Exact Acronym
            const exactAcronym = config.jobFlows.find(f => f.acronym.toLowerCase() === lowerRaw);
            if (exactAcronym) {
                bestMatchString = exactAcronym.acronym;
            } else {
                // 2. Fuzzy Name Match
                // "Single Batched" -> SIBP (Single Item Batch Pick)
                const candidates = config.jobFlows.map(flow => {
                    let score = 0;
                    const parts = flow.fullName.toLowerCase().split(' ');
                    parts.forEach(p => {
                        if (lowerRaw.includes(p)) score++;
                    });
                    // Check common terms replacement
                    if (lowerRaw.includes('pick') && flow.fullName.toLowerCase().includes('pick')) score += 0.5;
                    if (lowerRaw.includes('pack') && flow.fullName.toLowerCase().includes('pack')) score += 0.5;
                    if (lowerRaw.includes('sort') && flow.fullName.toLowerCase().includes('sort')) score += 0.5;

                    return { flow, score };
                });

                // Pick best score > threshold
                const best = candidates.sort((a, b) => b.score - a.score)[0];
                if (best && best.score >= 1.5) { // Threshold
                    bestMatchString = best.flow.acronym;
                }
            }

            if (bestMatchString) {
                newMapping[rawType] = bestMatchString;
                matchCount++;
            }
        });

        setLocalMapping(newMapping);
        setAutoMatchedCounts(matchCount);

    }, [isOpen, uniqueJobTypes, existingMapping, config.jobFlows]);

    const handleMapChange = (raw: string, acronym: string) => {
        setLocalMapping(prev => ({
            ...prev,
            [raw]: acronym
        }));
    };

    const handleSave = () => {
        onSave(localMapping);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border-light dark:border-slate-700">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-primary-500" />
                            Job Type Mapping
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                            Map your file's Job Types to Engineered Standards to enable granular analysis.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {autoMatchedCounts > 0 && (
                        <div className="mb-6 bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-slate-700 rounded-full">
                                <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-indigo-900 dark:text-slate-200 text-sm">Auto-matched {autoMatchedCounts} job types.</h4>
                                <p className="text-xs text-indigo-700 dark:text-slate-400">Please review the mappings below and adjust if necessary.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 mb-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg font-medium text-sm text-text-muted">
                            <div>Uploaded Job Type</div>
                            <div className="w-8"></div>
                            <div>Standard Process Flow</div>
                        </div>

                        {uniqueJobTypes.map((raw) => {
                            const mappedFlow = config.jobFlows.find(f => f.acronym === localMapping[raw]);

                            return (
                                <div key={raw} className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:border-primary-500/50 transition-colors shadow-sm">
                                    <div className="font-medium text-gray-900 dark:text-white break-all">
                                        {raw}
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                                    </div>

                                    <div>
                                        <select
                                            value={localMapping[raw] || ''}
                                            onChange={(e) => handleMapChange(raw, e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                        >
                                            <option value="">-- No Standard --</option>
                                            {config.jobFlows.map(flow => (
                                                <option key={flow.acronym} value={flow.acronym}>
                                                    {flow.fullName} ({flow.acronym})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-md shadow-primary-500/20 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save & Reprocess
                    </button>
                </div>
            </div>
        </div>
    );
}
