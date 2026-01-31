
import { AlertTriangle, CheckCircle, Info, XCircle, FileWarning } from 'lucide-react';
import { type IngestionSummary } from '../types';

interface DataHealthViewProps {
    summary: IngestionSummary;
    diagnostics?: {
        pickers: { user: string; reason: string }[];
        packers: { user: string; reason: string }[];
    };
}

function HealthCard({
    title,
    items,
    icon: Icon,
    variant
}: {
    title: string;
    items: string[];
    icon: any;
    variant: 'danger' | 'warning' | 'info';
}) {
    if (items.length === 0) return null;

    const styles = {
        danger: 'bg-red-50 border-red-200 text-red-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900'
    };

    const iconColors = {
        danger: 'text-red-600',
        warning: 'text-amber-600',
        info: 'text-blue-600'
    };

    return (
        <div className={`rounded-xl border p-6 ${styles[variant]}`}>
            <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-6 h-6 ${iconColors[variant]}`} />
                <h3 className="font-bold text-lg">{title}</h3>
                <span className="ml-auto text-sm font-medium px-2 py-1 rounded-full bg-white/50">
                    {items.length} issue{items.length !== 1 ? 's' : ''}
                </span>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        <span className="opacity-90 leading-snug">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function DataHealthView({ summary, diagnostics }: DataHealthViewProps) {
    const hasIssues = summary.errors.length > 0 || (summary.warnings && summary.warnings.length > 0);

    return (
        <div className="space-y-8 p-1 max-w-5xl mx-auto">

            {/* Header Status */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Dataset Diagnostics</h2>
                    <p className="text-slate-500 mt-1">
                        Processed <span className="font-mono font-medium">{summary.totalRows.toLocaleString()}</span> rows
                        with <span className="font-mono font-medium text-emerald-600">{summary.validRows.toLocaleString()}</span> valid records.
                    </p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${hasIssues ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                    {hasIssues ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    <span className="font-bold">{hasIssues ? 'Attention Required' : 'Healthy Dataset'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. Critical Errors */}
                {summary.errors.length > 0 && (
                    <HealthCard
                        title="Critical Errors"
                        items={summary.errors}
                        icon={XCircle}
                        variant="danger"
                    />
                )}

                {/* 2. Data Warnings */}
                {summary.warnings && summary.warnings.length > 0 && (
                    <HealthCard
                        title="Data Integrity Warnings"
                        items={summary.warnings}
                        icon={FileWarning}
                        variant="warning"
                    />
                )}

                {/* 3. Logic Assumptions */}
                {summary.assumptions && (
                    <HealthCard
                        title="System Assumptions"
                        items={summary.assumptions}
                        icon={Info}
                        variant="info"
                    />
                )}

                {/* Empty State for "Perfect" Data if no warnings/errors */}
                {!hasIssues && (
                    <div className="col-span-full bg-slate-50 border border-slate-200 border-dashed rounded-xl p-12 text-center text-slate-400">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium">No data integrity issues detected.</p>
                        <p className="text-sm">Assumptions are listed below for transparency.</p>
                    </div>
                )}
            </div>

            {/* Role Diagnostics Table */}
            {diagnostics && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-8">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800">Role Classification Audit</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Verify how users were assigned to roles based on JobCode/TaskType keywords match.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">

                        {/* Pickers */}
                        <div className="p-0">
                            <div className="bg-indigo-50/50 px-4 py-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                                <span>Identified Pickers ({diagnostics.pickers.length})</span>
                                <span>Trigger Source</span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {diagnostics.pickers.map((d, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-medium text-slate-700">{d.user}</td>
                                                <td className="px-4 py-2 text-slate-500 font-mono text-xs">{d.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Packers */}
                        <div className="p-0">
                            <div className="bg-emerald-50/50 px-4 py-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider border-b border-slate-100 flex justify-between">
                                <span>Identified Packers ({diagnostics.packers.length})</span>
                                <span>Trigger Source</span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-slate-100">
                                        {diagnostics.packers.map((d, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-medium text-slate-700">{d.user}</td>
                                                <td className="px-4 py-2 text-slate-500 font-mono text-xs">{d.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
