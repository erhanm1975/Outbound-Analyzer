import React, { useState } from 'react';
import { X, Check, ArrowRight, Settings2, LayoutTemplate, Calculator } from 'lucide-react';

interface UploadAssumptionsModalProps {
    isOpen: boolean;
    onConfirm: (is2DLayoutUsed: boolean, isEngineeredStandardsUsed: boolean) => void;
    onCancel: () => void;
}

export function UploadAssumptionsModal({ isOpen, onConfirm, onCancel }: UploadAssumptionsModalProps) {
    const [is2DLayout, setIs2DLayout] = useState(false);
    const [isEngStds, setIsEngStds] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-indigo-500" />
                            Global Assumptions
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Before processing, please specify the operating conditions of this warehouse.
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* 2D Layout Toggle */}
                    <div
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${is2DLayout ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                        onClick={() => setIs2DLayout(!is2DLayout)}
                    >
                        <div className={`p-2 rounded-lg ${is2DLayout ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <LayoutTemplate className={`w-5 h-5 ${is2DLayout ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className={`font-semibold ${is2DLayout ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    2D Spatial Layout
                                </h3>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${is2DLayout ? 'bg-indigo-500 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                    {is2DLayout && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
                                This facility utilizes a massive Put-to-Light or complex Put-Wall architecture requiring 2D walk routing.
                            </p>
                        </div>
                    </div>

                    {/* Engineered Standards Toggle */}
                    <div
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${isEngStds ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                        onClick={() => setIsEngStds(!isEngStds)}
                    >
                        <div className={`p-2 rounded-lg ${isEngStds ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <Calculator className={`w-5 h-5 ${isEngStds ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className={`font-semibold ${isEngStds ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    Engineered Standards
                                </h3>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isEngStds ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                    {isEngStds && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
                                This facility utilizes strict industrial engineering time studies (MOST, MTM) to govern process duration instead of historical averages.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(is2DLayout, isEngStds)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-2"
                    >
                        Begin Import
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
}
