import { AlertTriangle, CheckCircle, Info, XCircle, FileWarning } from 'lucide-react';
import { type IngestionSummary } from '../../types';
import { RichTooltip } from '../ui/rich-tooltip';
import { WorkloadProfilePanel } from '../workload-profile-panel';
import type { HealthStats } from '../../types';

interface DatasetDiagnosticsViewProps {
    summary: IngestionSummary;
    benchmarkSummary?: IngestionSummary;
    stats: HealthStats;
    benchmarkStats?: HealthStats | null;
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
        danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200'
    };

    const iconColors = {
        danger: 'text-red-600 dark:text-red-400',
        warning: 'text-amber-600 dark:text-amber-400',
        info: 'text-blue-600 dark:text-blue-400'
    };

    return (
        <div className={`rounded-xl border p-6 ${styles[variant]}`}>
            <div className="flex items-center gap-3 mb-4">
                <RichTooltip content={variant === 'danger' ? 'Errors that prevent correct data parsing.' : variant === 'warning' ? 'Issues that might affect accuracy but allow processing.' : 'Logic applied to fill missing data.'}>
                    <Icon className={`w-6 h-6 ${iconColors[variant]} cursor-help`} />
                </RichTooltip>
                <h3 className="font-bold text-lg dark:text-white">{title}</h3>
                <span className="ml-auto text-sm font-medium px-2 py-1 rounded-full bg-white/50 dark:bg-black/30">
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

export function DatasetDiagnosticsView({ summary, benchmarkSummary, stats, benchmarkStats }: DatasetDiagnosticsViewProps) {
    const renderBenchmarkDiff = (current: number, benchmark: number | undefined, inverse: boolean = false) => {
        if (benchmark === undefined || benchmark === 0) return null;
        const delta = current - benchmark;
        const pct = ((delta / benchmark) * 100).toFixed(1);
        const isPositive = delta > 0;
        const isNeutral = delta === 0;

        let colorClass = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        if (inverse) colorClass = isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
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
            {/* Top Row: Diagnostics / Assumptions / Workload */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Column 1: Dataset Diagnostics Header */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Dataset Diagnostics</h2>
                        <div className="text-slate-500 dark:text-slate-400 py-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Processed</span>
                                <RichTooltip content="Total raw lines read from the uploaded file">
                                    <span className="font-mono text-lg font-bold border-b border-dotted border-slate-400 cursor-help">{summary.totalRows.toLocaleString()}</span>
                                </RichTooltip>
                                {renderBenchmarkDiff(summary.totalRows, benchmarkSummary?.totalRows)}
                                <span className="text-sm">rows</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">with</span>
                                <RichTooltip content="Rows successfully parsed into usable operational records">
                                    <span className="font-mono text-lg font-bold text-emerald-600 border-b border-dotted border-emerald-400 cursor-help">{summary.validRows.toLocaleString()}</span>
                                </RichTooltip>
                                {renderBenchmarkDiff(summary.validRows, benchmarkSummary?.validRows)}
                                <span className="text-sm">valid records.</span>
                            </div>
                        </div>
                    </div>
                    <div className={`mt-auto flex items-center justify-center gap-2 p-3 rounded-xl border ${hasIssues ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
                        }`}>
                        <RichTooltip content={hasIssues ? "Data quality issues detected. Review warnings below." : "All checks passed. Data is clean."}>
                            {hasIssues ? <AlertTriangle className="w-5 h-5 cursor-help" /> : <CheckCircle className="w-5 h-5 cursor-help" />}
                        </RichTooltip>
                        <span className="font-bold text-sm tracking-wide uppercase">{hasIssues ? 'Attention Required' : 'Healthy Dataset'}</span>
                    </div>
                </div>

                {/* Column 2: System Assumptions */}
                <div className="h-full flex flex-col">
                    <HealthCard
                        title="System Assumptions"
                        items={summary.assumptions}
                        icon={Info}
                        variant="info"
                    />
                </div>

                {/* Column 3: Workload Profile */}
                <div className="h-full flex flex-col">
                    <WorkloadProfilePanel
                        stats={stats}
                        benchmarkStats={benchmarkStats}
                        className="h-full !rounded-2xl"
                    />
                </div>
            </div>

            {/* Bottom Row: Errors and Warnings (Only show if they exist) */}
            {(hasErrors || hasWarnings) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                    {hasErrors && (
                        <HealthCard
                            title="Critical Errors"
                            items={summary.errors}
                            icon={XCircle}
                            variant="danger"
                        />
                    )}
                    {hasWarnings && (
                        <HealthCard
                            title="Data Warnings"
                            items={summary.warnings}
                            icon={FileWarning}
                            variant="warning"
                        />
                    )}
                </div>
            )}
        </div>
    );
}
