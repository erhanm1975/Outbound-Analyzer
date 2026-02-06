
import { AlertTriangle, CheckCircle, Info, XCircle, FileWarning } from 'lucide-react';
import { type IngestionSummary } from '../types';
import { RichTooltip } from './rich-tooltip';

interface DataHealthViewProps {
    summary: IngestionSummary;
    diagnostics?: {
        pickers: { user: string; reason: string }[];
        packers: { user: string; reason: string }[];
    };
    benchmarkSummary?: IngestionSummary;
    benchmarkDiagnostics?: {
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
                <RichTooltip content={variant === 'danger' ? 'Errors that prevent correct data parsing.' : variant === 'warning' ? 'Issues that might affect accuracy but allow processing.' : 'Logic applied to fill missing data.'}>
                    <Icon className={`w-6 h-6 ${iconColors[variant]} cursor-help`} />
                </RichTooltip>
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

export function DataHealthView({ summary, diagnostics, benchmarkSummary, benchmarkDiagnostics }: DataHealthViewProps) {
    // Debug Logging
    console.log('🔍 DataHealthView Render Debug:', {
        hasSummary: !!summary,
        hasDiagnostics: !!diagnostics,
        benchmarkSummary,
        hasBenchmarkDiagnostics: !!benchmarkDiagnostics,
        summaryRows: summary.totalRows,
        benchmarkRows: benchmarkSummary?.totalRows
    });

    // Helper to calculate delta and render indicator
    const renderBenchmarkDiff = (current: number, benchmark: number | undefined, inverse: boolean = false) => {
        if (benchmark === undefined || benchmark === 0) return null;
        const delta = current - benchmark;
        const pct = ((delta / benchmark) * 100).toFixed(1);
        const isPositive = delta > 0;
        const isNeutral = delta === 0;

        // For counts, usually "more is better" or neutral, unless it's errors.
        // Let's assume neutral coloring for now unless specified.
        let colorClass = isPositive ? 'text-emerald-600' : 'text-rose-600';
        if (inverse) colorClass = isPositive ? 'text-rose-600' : 'text-emerald-600';
        if (isNeutral) colorClass = 'text-slate-400';

        return (
            <span className={`text-[10px] font-bold ml-1 ${colorClass}`}>
                ({delta > 0 ? '+' : ''}{pct}% vs {benchmark.toLocaleString()})
            </span>
        );
    };

    const hasErrors = summary.errors.length > 0;
    const hasWarnings = summary.warnings.length > 0;
    const hasIssues = hasErrors || hasWarnings;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Status Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Dataset Diagnostics</h2>
                    <div className="text-slate-500 mt-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                            <span>Processed </span>
                            <RichTooltip content="Total raw lines read from the uploaded file">
                                <span className="font-mono font-medium border-b border-dotted border-slate-400 cursor-help">{summary.totalRows.toLocaleString()}</span>
                            </RichTooltip>
                            {renderBenchmarkDiff(summary.totalRows, benchmarkSummary?.totalRows)}
                            <span> rows</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span>with </span>
                            <RichTooltip content="Rows successfully parsed into usable operational records">
                                <span className="font-mono font-medium text-emerald-600 border-b border-dotted border-emerald-400 cursor-help">{summary.validRows.toLocaleString()}</span>
                            </RichTooltip>
                            {renderBenchmarkDiff(summary.validRows, benchmarkSummary?.validRows)}
                            <span> valid records.</span>
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${hasIssues ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                    <RichTooltip content={hasIssues ? "Data quality issues detected. Review warnings below." : "All checks passed. Data is clean."}>
                        {hasIssues ? <AlertTriangle className="w-5 h-5 cursor-help" /> : <CheckCircle className="w-5 h-5 cursor-help" />}
                    </RichTooltip>
                    <span className="font-bold">{hasIssues ? 'Attention Required' : 'Healthy Dataset'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HealthCard
                    title="Critical Errors"
                    items={summary.errors}
                    icon={XCircle}
                    variant="danger"
                />
                <HealthCard
                    title="Data Warnings"
                    items={summary.warnings}
                    icon={FileWarning}
                    variant="warning"
                />
                <HealthCard
                    title="System Assumptions"
                    items={summary.assumptions}
                    icon={Info}
                    variant="info"
                />
            </div>

            {/* Role Diagnostics Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-8">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-800">Role Classification Audit</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Verify how users were assigned to roles based on JobCode/TaskType keywords match.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">

                    {/* Pickers */}
                    <div className="p-0">
                        <div className="bg-indigo-50/50 px-4 py-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider border-b border-slate-100 flex justify-between items-center">
                            <RichTooltip content="Users identified as Pickers based on 'Pick', 'Replen', or 'Put' task activity.">
                                <div className="flex items-center gap-2">
                                    <span className="border-b border-dotted border-indigo-300 cursor-help">Identified Pickers ({diagnostics?.pickers.length ?? 0})</span>
                                    {renderBenchmarkDiff(diagnostics?.pickers.length ?? 0, benchmarkDiagnostics?.pickers.length)}
                                </div>
                            </RichTooltip>
                            <span>Trigger Source</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {diagnostics?.pickers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">No pickers identified</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white sticky top-0 text-xs text-slate-500 font-medium border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2 w-1/2">User ID</th>
                                            <th className="px-4 py-2 w-1/2">Match Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {diagnostics?.pickers.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2 font-mono text-xs text-slate-700">{p.user}</td>
                                                <td className="px-4 py-2 text-xs text-slate-500">{p.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Packers */}
                    <div className="p-0">
                        <div className="bg-emerald-50/50 px-4 py-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider border-b border-slate-100 flex justify-between items-center">
                            <RichTooltip content="Users identified as Packers based on 'Pack', 'Wrap', or 'Ship' task activity.">
                                <div className="flex items-center gap-2">
                                    <span className="border-b border-dotted border-emerald-300 cursor-help">Identified Packers ({diagnostics?.packers.length ?? 0})</span>
                                    {renderBenchmarkDiff(diagnostics?.packers.length ?? 0, benchmarkDiagnostics?.packers.length)}
                                </div>
                            </RichTooltip>
                            <span>Trigger Source</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {diagnostics?.packers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">No packers identified</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white sticky top-0 text-xs text-slate-500 font-medium border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2 w-1/2">User ID</th>
                                            <th className="px-4 py-2 w-1/2">Match Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {diagnostics?.packers.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2 font-mono text-xs text-slate-700">{p.user}</td>
                                                <td className="px-4 py-2 text-xs text-slate-500">{p.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
