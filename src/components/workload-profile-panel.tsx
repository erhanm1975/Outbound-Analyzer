import { Box, Activity, Clock, Layers, Info } from 'lucide-react';
import { RichTooltip } from './rich-tooltip';
import type { HealthStats } from '../types';
import { cn } from '../lib/utils';
import { METRIC_TOOLTIPS } from '../logic/metric-definitions';

interface WorkloadProfilePanelProps {
    stats: HealthStats;
    benchmarkStats?: HealthStats | null;
    className?: string;
}

export function WorkloadProfilePanel({ stats, benchmarkStats, className }: WorkloadProfilePanelProps) {
    const metrics = [
        {
            label: "Total Jobs",
            value: stats.totalJobs.toLocaleString(),
            icon: <Box className="w-4 h-4 text-teal-600" />,
            benchmark: benchmarkStats?.totalJobs,
            isLowerBetter: true,
            tooltip: METRIC_TOOLTIPS.WORKLOAD_TOTAL_JOBS
        },
        {
            label: "Avg Units/Job",
            value: stats.avgUnitsPerJob.toLocaleString(),
            icon: <Activity className="w-4 h-4 text-emerald-600" />,
            benchmark: benchmarkStats?.avgUnitsPerJob,
            isLowerBetter: false,
            tooltip: METRIC_TOOLTIPS.WORKLOAD_UNITS_JOB
        },
        {
            label: "Avg SKUs/Job",
            value: stats.avgSkusPerJob.toLocaleString(),
            icon: <Layers className="w-4 h-4 text-purple-600" />,
            benchmark: benchmarkStats?.avgSkusPerJob,
            isLowerBetter: false,
            tooltip: METRIC_TOOLTIPS.WORKLOAD_SKUS_JOB
        },
        {
            label: "Avg Locs/Job",
            value: stats.avgLocationsPerJob.toLocaleString(),
            icon: <Activity className="w-4 h-4 text-indigo-600" />,
            benchmark: benchmarkStats?.avgLocationsPerJob,
            isLowerBetter: true,
            tooltip: METRIC_TOOLTIPS.WORKLOAD_LOCS_JOB
        },
        {
            label: "Avg Orders/Job",
            value: stats.avgOrdersPerJob.toLocaleString(),
            icon: <Clock className="w-4 h-4 text-blue-600" />,
            benchmark: benchmarkStats?.avgOrdersPerJob,
            isLowerBetter: false,
            tooltip: METRIC_TOOLTIPS.WORKLOAD_ORDERS_JOB
        },
        {
            label: "Avg Tasks/Job",
            value: stats.avgTasksPerJob.toLocaleString(),
            icon: <Activity className="w-4 h-4 text-cyan-600" />,
            benchmark: benchmarkStats?.avgTasksPerJob,
            isLowerBetter: false,
            tooltip: METRIC_TOOLTIPS.WORKLOAD_TASKS_JOB
        }
    ];

    return (
        <div className={cn("bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/60 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm", className)}>
            <div className="flex items-center gap-2 mb-6">
                <div className="h-4 w-1 rounded-full bg-teal-500"></div>
                <h3 className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">Workload Profile</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => {
                    const delta = m.benchmark ? Number(m.value.replace(/,/g, '')) - m.benchmark : 0;
                    const percent = m.benchmark ? (delta / m.benchmark) * 100 : 0;
                    const isPositive = percent > 0;
                    const isGood = m.isLowerBetter ? percent < 0 : percent > 0;

                    return (
                        <div key={i} className="flex flex-col">
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1 flex items-center gap-1.5">
                                {m.icon}
                                {m.label}
                                {m.tooltip && (
                                    <RichTooltip
                                        content={m.tooltip}
                                        className="ml-1"
                                        trigger={<Info className="w-3 h-3 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help" />}
                                    />
                                )}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{m.value}</span>

                                {m.benchmark && Math.abs(percent) > 0.1 && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/50 border border-white/40",
                                        isGood ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {isPositive ? '+' : ''}{percent.toFixed(2)}%
                                        <span className="text-slate-400 font-normal ml-1">
                                            (vs {m.benchmark?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
