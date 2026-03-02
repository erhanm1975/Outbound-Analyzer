import React, { useState } from 'react';
import type { TaskObject, EngineeredStandardsConfig } from '../../types';
import { calculateAmortizedDetail, resolveCardId } from '../../logic/calculation-service';

interface AggregatedJob {
    id: string;
    WaveCode: string;
    JobCode: string;
    JobType: string;
    RawJobType: string;
    TotalStandardDuration: number;
    TotalOrders: number;
    TotalSKUs: number;
    TotalUnits: number;
    TotalLocations: number;
}

interface StandardsDetailViewProps {
    jobs: AggregatedJob[];
    tasks: TaskObject[];
    config: EngineeredStandardsConfig | undefined;
}

export function StandardsDetailView({ jobs, tasks, config }: StandardsDetailViewProps) {
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const toggleJob = (id: string) => {
        setExpandedJobId(prev => prev === id ? null : id);
        setExpandedTaskId(null);
    };

    const toggleTask = (id: string) => {
        setExpandedTaskId(prev => prev === id ? null : id);
    };

    const formatTime = (sec: number | undefined) => {
        if (!sec && sec !== 0) return '-';
        if (sec === 0) return '0.00';
        return sec.toFixed(2);
    };

    const Th = ({ children, align = 'left' }: { children: React.ReactNode, align?: 'left' | 'right' | 'center' }) => (
        <th className={`p-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-${align} border-b border-white/10`}>
            {children}
        </th>
    );

    return (
        <div className="w-full h-full overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-white/10">
                    <tr>
                        <th className="w-8 p-3"></th>
                        <Th>Job Code</Th>
                        <Th>Job Type</Th>
                        <Th align="right">Orders</Th>
                        <Th align="right">SKUs</Th>
                        <Th align="right">Units</Th>
                        <Th align="right">Locations</Th>
                        <Th align="right">Total Standard Duration (sec)</Th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {jobs.map((job) => {
                        const jobTasks = tasks.filter(t => t.JobCode === job.JobCode);

                        // Compute amortized job total = sum of all per-task amortized durations
                        const amortizedJobTotal = jobTasks.reduce((sum, task) => {
                            if (!config) return sum;
                            const details = calculateAmortizedDetail(task, config, {
                                taskCount: jobTasks.length,
                                locationCount: job.TotalLocations,
                                orderCount: job.TotalOrders
                            });
                            return sum + details.reduce((s, r) => s + r.amortizedStdTime, 0);
                        }, 0);

                        return (
                            <React.Fragment key={job.id}>
                                {/* LEVEL 1: JOB ROW */}
                                <tr
                                    className={`hover:bg-white/[0.02] transition-colors group cursor-pointer ${expandedJobId === job.id ? 'bg-white/[0.02]' : ''}`}
                                    onClick={() => toggleJob(job.id)}
                                >
                                    <td className="p-3 text-slate-500 group-hover:text-cyan-400 transition-colors">
                                        <span className="material-symbols-outlined text-sm">
                                            {expandedJobId === job.id ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm font-medium text-slate-200 font-mono group-hover:text-cyan-400 transition-colors border-l-2 border-transparent hover:border-cyan-500">{job.JobCode}</td>
                                    <td className="p-3 text-xs text-slate-400 uppercase tracking-wider">{job.JobType}</td>
                                    <td className="p-3 text-sm text-right text-slate-400 font-mono">{job.TotalOrders}</td>
                                    <td className="p-3 text-sm text-right text-slate-400 font-mono">{job.TotalSKUs}</td>
                                    <td className="p-3 text-sm text-right text-slate-400 font-mono">{job.TotalUnits}</td>
                                    <td className="p-3 text-sm text-right text-slate-400 font-mono">{job.TotalLocations}</td>
                                    <td className="p-3 text-sm text-right font-bold text-cyan-400 font-mono">{formatTime(amortizedJobTotal)}s</td>
                                </tr>

                                {/* LEVEL 2: TASKS CONTAINER */}
                                {expandedJobId === job.id && (
                                    <tr>
                                        <td colSpan={8} className="p-0 bg-slate-950/50 border-b border-white/10">
                                            <div className="p-4 pl-12">
                                                <table className="w-full text-left border-collapse bg-slate-900 rounded-lg overflow-hidden border border-white/5 shadow-inner">
                                                    <thead className="bg-slate-800/50">
                                                        <tr>
                                                            <th className="w-8 p-2"></th>
                                                            <th className="p-2 text-xs font-semibold text-slate-400">Task Type</th>
                                                            <th className="p-2 text-xs font-semibold text-slate-400">Order ID</th>
                                                            <th className="p-2 text-xs font-semibold text-slate-400">SKU</th>
                                                            <th className="p-2 text-xs font-semibold text-slate-400 text-right">Qty</th>
                                                            <th className="p-2 text-xs font-semibold text-slate-400 text-right">Standard Duration (sec)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {jobTasks.map((task, index) => {
                                                            // Compute amortized duration for this task
                                                            let amortizedDuration = 0;
                                                            if (config) {
                                                                const details = calculateAmortizedDetail(task, config, {
                                                                    taskCount: jobTasks.length,
                                                                    locationCount: job.TotalLocations,
                                                                    orderCount: job.TotalOrders
                                                                });
                                                                amortizedDuration = details.reduce((s, r) => s + r.amortizedStdTime, 0);
                                                            }
                                                            return (
                                                                <React.Fragment key={`${task.JobCode}-${index}`}>
                                                                    <tr
                                                                        className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${expandedTaskId === `${task.JobCode}-${index}` ? 'bg-white/[0.04]' : ''}`}
                                                                        onClick={() => toggleTask(`${task.JobCode}-${index}`)}
                                                                    >
                                                                        <td className="p-2 text-slate-500 pl-4">
                                                                            <span className="material-symbols-outlined text-xs">
                                                                                {expandedTaskId === `${task.JobCode}-${index}` ? 'expand_more' : 'chevron_right'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-2 text-sm text-slate-300 font-mono">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${task.TaskType.toUpperCase().includes('PICK') ? 'bg-emerald-500/10 text-emerald-400' :
                                                                                task.TaskType.toUpperCase().includes('SORT') ? 'bg-blue-500/10 text-blue-400' :
                                                                                    task.TaskType.toUpperCase().includes('PACK') ? 'bg-indigo-500/10 text-indigo-400' :
                                                                                        'bg-slate-500/10 text-slate-400'
                                                                                }`}>
                                                                                {task.TaskType}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-2 text-sm text-slate-300 font-mono">{task.OrderCode || '-'}</td>
                                                                        <td className="p-2 text-sm text-slate-300 font-mono">{task.SKU || '-'}</td>
                                                                        <td className="p-2 text-sm text-right text-slate-300 font-mono">{task.Quantity}</td>
                                                                        <td className="p-2 text-sm text-right font-bold text-amber-400 font-mono">
                                                                            {formatTime(amortizedDuration)}s
                                                                        </td>
                                                                    </tr>

                                                                    {/* LEVEL 3: MICRO ACTIVITIES */}
                                                                    {expandedTaskId === `${task.JobCode}-${index}` && (
                                                                        <tr>
                                                                            <td colSpan={6} className="p-0 bg-slate-950/80">
                                                                                <TaskMicroBreakdownPanel
                                                                                    task={task}
                                                                                    config={config}
                                                                                    previousTask={index > 0 ? jobTasks[index - 1] : undefined}
                                                                                    totalTasksInJob={jobTasks.length}
                                                                                    totalLocationsInJob={job.TotalLocations}
                                                                                    totalOrdersInJob={job.TotalOrders}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------------
// Level 3: Micro-Activity Builder — Amortized Distribution
// ---------------------------------------------------------------------------------
interface MicroBreakdownProps {
    task: TaskObject;
    config: EngineeredStandardsConfig | undefined;
    previousTask?: TaskObject;
    totalTasksInJob: number;
    totalLocationsInJob: number;
    totalOrdersInJob: number;
}

function TaskMicroBreakdownPanel({ task, config, previousTask, totalTasksInJob, totalLocationsInJob, totalOrdersInJob }: MicroBreakdownProps) {
    if (!config) return <div className="p-4 text-xs text-slate-500">No configuration loaded.</div>;

    const flowClass = task.JobType || 'Standard';
    const cardId = resolveCardId(flowClass, task.TaskType || '', config);
    const standardCard = config.cards.find(c => c.id === cardId);

    if (!standardCard) {
        return <div className="p-4 text-xs text-slate-500">No standard card mapped for {flowClass} {task.TaskType}.</div>;
    }

    const N = Math.max(1, totalTasksInJob);
    const L = Math.max(1, totalLocationsInJob);
    const O = Math.max(1, totalOrdersInJob);

    const rows = calculateAmortizedDetail(task, config, { taskCount: N, locationCount: L, orderCount: O });
    const calculatedTotal = rows.reduce((sum, r) => sum + r.amortizedStdTime, 0);

    return (
        <div className="p-4 pl-16 py-3 border-l-4 border-cyan-500/30">
            <h4 className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">account_tree</span>
                Amortized Micro-Activities · {standardCard.title || cardId}
            </h4>
            <p className="text-[10px] text-slate-500 mb-2">
                Job context: {N} tasks · {L} locations · {O} orders · {task.Quantity} units in this task
            </p>
            <div className="grid grid-cols-1 gap-1 w-full max-w-3xl">
                {rows.map((row, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs py-1.5 px-3 rounded border transition-colors ${row.isZero
                        ? 'bg-white/[0.01] border-white/[0.03] opacity-50'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                        }`}>
                        <div className="flex flex-col">
                            <span className={`font-medium ${row.isZero ? 'text-slate-500' : 'text-slate-300'}`}>{row.label}</span>
                            <span className="text-[10px] text-slate-500">Bucket: {row.bucket}</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono">
                            <span className="text-slate-500 text-[10px] w-48 text-right">{row.formula}</span>
                            <span className={`font-bold w-20 text-right ${row.isZero ? 'text-slate-600' : 'text-cyan-400'}`}>{row.amortizedStdTime.toFixed(2)}s</span>
                        </div>
                    </div>
                ))}

                <div className="flex items-center justify-between text-xs py-2 px-3 bg-cyan-950/20 rounded mt-1 border border-cyan-500/20">
                    <span className="text-cyan-400 font-bold uppercase">Amortized Task Total</span>
                    <span className="text-cyan-400 font-bold font-mono text-sm">{calculatedTotal.toFixed(2)}s</span>
                </div>
            </div>
        </div>
    );
}
