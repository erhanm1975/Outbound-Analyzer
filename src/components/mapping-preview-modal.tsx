import React from 'react';
import type { MappingPreviewResult } from '../types';
import { X, Check, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface MappingPreviewModalProps {
    isOpen: boolean;
    results: MappingPreviewResult[] | null;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}

export function MappingPreviewModal({ isOpen, results, onConfirm, onCancel, isProcessing }: MappingPreviewModalProps) {
    if (!isOpen || !results) return null;

    // Calculate stats
    const totalFiles = results.length;
    const filesWithErrors = results.filter(r => r.error).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                            Import Preview
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Review how your file columns will be mapped before processing.
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {results.map((result, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">
                                    File {idx + 1}/{totalFiles}
                                </span>
                                <h3 className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={result.fileName}>
                                    {result.fileName}
                                </h3>
                                {result.error && (
                                    <span className="text-xs text-rose-500 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded">
                                        <AlertTriangle className="w-3 h-3" /> Failed to read
                                    </span>
                                )}
                            </div>

                            {result.error ? (
                                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg border border-rose-200 dark:border-rose-900">
                                    Error: {result.error}
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                                            <tr>
                                                <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 w-1/2">Source Column (File)</th>
                                                <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 w-10"></th>
                                                <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 w-1/2">Target Field (System)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {result.mappings.map((m, i) => (
                                                <tr key={i} className={m.mappedTo ? 'bg-emerald-50/10 dark:bg-emerald-900/5' : ''}>
                                                    <td className={`px-4 py-2.5 font-mono text-xs ${m.mappedTo ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 decoration-slate-300'}`}>
                                                        {m.raw}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <ArrowRight className={`w-3 h-3 ${m.mappedTo ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`} />
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {m.mappedTo ? (
                                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100/50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit">
                                                                <Check className="w-3 h-3" />
                                                                {m.mappedTo}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">Skipped</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Summary count */}
                            <div className="text-xs text-slate-500 pl-1">
                                <span className="text-emerald-500 font-medium">{result.mappings.filter(m => m.mappedTo).length} mapped</span>
                                <span className="mx-1">•</span>
                                <span>{result.mappings.filter(m => !m.mappedTo).length} skipped</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-700 lg:flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 lg:mb-0">
                        {filesWithErrors > 0 && (
                            <span className="text-rose-500 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                {filesWithErrors} file(s) had errors and cannot be fully mapped.
                            </span>
                        )}
                        {!filesWithErrors && (
                            <span>Check that all required fields (Start, Finish, User, Quantity) are mapped.</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 justify-end">
                        <button
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isProcessing || filesWithErrors === totalFiles}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Importing...' : 'Confirm Import'}
                            {!isProcessing && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
