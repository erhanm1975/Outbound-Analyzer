import { type IngestionSummary } from '../types';
import { AlertCircle, CheckCircle2, FileText, Calendar, Users, Warehouse, Building2 } from 'lucide-react';

interface ImportSummaryProps {
    summary: IngestionSummary;
    onClose: () => void;
}

export function ImportSummary({ summary, onClose }: ImportSummaryProps) {
    const hasErrors = summary.errorRows > 0 || summary.errors.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Import Summary
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Processed {summary.totalRows.toLocaleString()} rows
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-emerald-700 mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Valid</span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-900">{summary.validRows.toLocaleString()}</div>
                        </div>

                        <div className={`bg-${hasErrors ? 'rose' : 'slate'}-50 border border-${hasErrors ? 'rose' : 'slate'}-100 p-4 rounded-lg`}>
                            <div className={`flex items-center gap-2 text-${hasErrors ? 'rose' : 'slate'}-700 mb-2`}>
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Errors</span>
                            </div>
                            <div className={`text-2xl font-bold text-${hasErrors ? 'rose' : 'slate'}-900`}>{summary.errorRows.toLocaleString()}</div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Users</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-900">{summary.uniqueUsers}</div>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-purple-700 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">Date Range</span>
                            </div>
                            <div className="text-xs font-medium text-purple-900">
                                {summary.dateRange ? (
                                    <>
                                        <div>{summary.dateRange.start.toLocaleDateString()}</div>
                                        <div className="text-purple-400">to</div>
                                        <div>{summary.dateRange.end.toLocaleDateString()}</div>
                                    </>
                                ) : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Context Details */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Warehouse className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold">Warehouses found:</span>
                            <div className="flex gap-2 flex-wrap">
                                {summary.warehouses.length > 0 ? summary.warehouses.map(w => (
                                    <span key={w} className="px-2 py-0.5 bg-slate-100 rounded text-xs border border-slate-200">{w}</span>
                                )) : <span className="text-slate-400 italic">None</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold">Clients found:</span>
                            <div className="flex gap-2 flex-wrap">
                                {summary.clients.length > 0 ? summary.clients.map(c => (
                                    <span key={c} className="px-2 py-0.5 bg-slate-100 rounded text-xs border border-slate-200">{c}</span>
                                )) : <span className="text-slate-400 italic">None</span>}
                            </div>
                        </div>
                    </div>

                    {/* Errors List */}
                    {hasErrors && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                            <h3 className="text-rose-800 font-semibold text-sm mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Top Import Issues (First 10)
                            </h3>
                            <div className="max-h-40 overflow-y-auto text-xs font-mono text-rose-700 space-y-1">
                                {summary.errors.length > 0 ? summary.errors.map((err, i) => (
                                    <div key={i} className="border-b border-rose-100 last:border-0 pb-1 last:pb-0">
                                        {err}
                                    </div>
                                )) : (
                                    <div>{summary.errorRows} processed rows were invalid but exact errors were suppressed in this summary.</div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                    >
                        Review Analysis Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
