import { X, Clock, AlertTriangle, Coffee, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { type ActivityObject, type TaskObject } from '../types';
import { format } from 'date-fns';

interface JobDetailPanelProps {
    job: ActivityObject;
    tasks: TaskObject[];
    onClose: () => void;
}

export function JobDetailPanel({ job, tasks, onClose }: JobDetailPanelProps) {
    // 1. Calculate Metrics
    const durationSec = (job.Finish.getTime() - job.Start.getTime()) / 1000;

    // Efficiency Totals
    const directSec = job.TaskDirectTimeSec;
    const travelSec = job.TaskTravelTimeSec;
    const unprodSec = job.UnproductiveDurationSec;
    const totalActive = directSec + travelSec + unprodSec; // Use this or durationSec? usually duration for %

    // Ensure we don't divide by zero
    const baseDuration = durationSec > 0 ? durationSec : 1;

    const procPct = Math.min(100, Math.round((directSec / baseDuration) * 100));
    const travelPct = Math.min(100, Math.round((travelSec / baseDuration) * 100));
    const unprodPct = Math.min(100, Math.round((unprodSec / baseDuration) * 100));
    const efficiencyScore = Math.min(100, Math.round(((directSec + travelSec) / baseDuration) * 100));

    // Activity Breakdown (Simple count or duration?)
    // Let's go by count for the bar chart as per user UI "picking 55%" usually refers to tasks or time. 
    // Let's use Time for "Efficiency Breakdown" logic in the snippet.
    // Actually the snippet has "Picking 55%", "Sorting 25%" -- implies mapping tasks to types.

    const taskTypes = tasks.reduce((acc, t) => {
        const type = t.TaskType.split(' ')[0].toLowerCase(); // "pick", "pack", etc.
        const dur = t.TaskDirectTimeSec ?? 0; // weighted by time?
        // simple mapping
        if (type.includes('pick')) acc.pick += dur;
        else if (type.includes('pack')) acc.pack += dur;
        else if (type.includes('sort')) acc.sort += dur;
        else acc.other += dur;
        return acc;
    }, { pick: 0, pack: 0, sort: 0, other: 0 });

    const totalTaskTime = Object.values(taskTypes).reduce((a, b) => a + b, 0) || 1;
    const pickPct = Math.round((taskTypes.pick / totalTaskTime) * 100);
    const packPct = Math.round((taskTypes.pack / totalTaskTime) * 100);
    const sortPct = Math.round((taskTypes.sort / totalTaskTime) * 100);
    const otherPct = Math.round((taskTypes.other / totalTaskTime) * 100);

    // Gaps Logic
    const gaps = tasks.filter(t => t.TaskType === 'No Activity' || t.TaskType === 'Break');
    const totalGapDuration = gaps.reduce((acc, t) => acc + t.UnproductiveDurationSec, 0);

    // Avg Task Duration
    const avgTaskDur = job.NofTasks > 0 ? (directSec / job.NofTasks).toFixed(0) : 0;

    // Is Multi-Task?
    const distinctTypes = new Set(tasks.map(t => t.TaskType.split(' ')[0]));
    const isMultiTask = distinctTypes.size > 1;

    // Format Helpers
    const fmtDur = (sec: number) => {
        if (sec < 60) return `${Math.floor(sec)}s`;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}m ${s}s`;
    };

    return (
        <div className="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-[#111418] border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out translate-x-0 flex flex-col font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f151c]">
                <div>
                    <h3 className="text-lg font-bold text-white font-mono tracking-tight">{job.JobCode || 'Unassigned'}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Forensic Job Analysis</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-300 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#111418]">

                {/* 1. Efficiency & Breakdown */}
                <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700/50">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Efficiency & Breakdown</h4>
                    <div className="flex gap-6 items-center">
                        {/* Donut Chart (SVG) */}
                        <div className="relative w-32 h-32 shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                {/* Background Circle */}
                                <path className="text-slate-700" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8"></path>
                                {/* Travel segment (Simulated offset) */}
                                <path className="text-slate-500" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor"
                                    strokeDasharray={`${travelPct}, 100`}
                                    strokeDashoffset={`${-procPct}`} // Travel starts after Process
                                    strokeWidth="3.8"></path>
                                {/* Process segment */}
                                <path className="text-emerald-500" d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor"
                                    strokeDasharray={`${procPct}, 100`}
                                    strokeWidth="3.8"></path>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-bold text-white leading-none">{efficiencyScore}%</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Eff. Score</span>
                            </div>
                        </div>

                        {/* Breakdown Bars */}
                        <div className="flex-1 flex flex-col justify-center gap-3">
                            <div className="space-y-2">
                                {/* Picking */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                    <span className="font-medium">Picking</span>
                                    <span className="font-mono">{pickPct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pickPct}%` }}></div>
                                </div>
                                {/* Sorting */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                    <span className="font-medium">Sorting</span>
                                    <span className="font-mono">{sortPct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${sortPct}%` }}></div>
                                </div>
                                {/* Packing */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                    <span className="font-medium">Packing</span>
                                    <span className="font-mono">{packPct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${packPct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-medium text-slate-300">Process Time</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                            <span className="text-[10px] font-medium text-slate-300">Travel Time</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] font-medium text-slate-300">Idle / Gap</span>
                        </div>
                    </div>
                </div>

                {/* 2. Job Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Job Type</span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-indigo-900/30 text-indigo-300 border border-indigo-800 font-mono">
                            {isMultiTask ? 'MULTI-TASK' : (Array.from(distinctTypes)[0] || 'UNKNOWN').toUpperCase()}
                        </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Total Tasks</span>
                        <span className="text-xl font-bold text-white font-mono">{job.NofTasks}</span>
                        <span className="text-xs text-emerald-400 font-medium ml-2">tasks</span>
                    </div>
                </div>

                {/* 3. Time Forensics */}
                <div>
                    <div className="flex items-center gap-2 mb-3 bg-slate-800/80 px-3 py-2 rounded border-l-4 border-slate-600">
                        <Timer className="w-5 h-5 text-slate-400" />
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Time Forensics</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                            <span className="text-xs text-slate-400 block mb-1">Net Duration (Active)</span>
                            <span className="text-lg font-bold text-white font-mono">{fmtDur(directSec + travelSec)}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">Excl. intra-job breaks</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 block mb-1">Avg Task Duration</span>
                            <span className="text-lg font-bold text-white font-mono">{avgTaskDur}s / unit</span>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                                <TrendingDown className="w-3 h-3" />
                                <span>Optimal pace</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Intra-Job Breaks (Gaps) */}
                {gaps.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 bg-rose-900/10 px-3 py-2 rounded border-l-4 border-rose-700">
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">Intra-Job Breaks</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
                                <span className="text-sm text-slate-400">Total Gap Time ({'>'}60s)</span>
                                <span className="text-base font-bold text-rose-400 font-mono">{fmtDur(totalGapDuration)}</span>
                            </div>
                            {gaps.map((g, i) => (
                                <div key={i} className="flex items-start gap-3 pl-2 border-l-2 border-slate-700">
                                    <div className="flex-1">
                                        <span className="text-xs font-medium text-white block">Gap #{i + 1}: {g.Location || 'Unknown Loc'}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {format(g.Start, 'hh:mm:ss')} - {format(g.Finish, 'hh:mm:ss')}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-300 font-mono">{g.UnproductiveDurationSec.toFixed(0)}s</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. Inter-Job Context (Placeholder for now, requires prev job logic passed in) */}
                <div>
                    <div className="flex items-center gap-2 mb-3 bg-amber-900/10 px-3 py-2 rounded border-l-4 border-amber-700">
                        <Coffee className="w-5 h-5 text-amber-500" />
                        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Inter-Job Context</h4>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Coffee className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-300 block">Pre-Job Gap</span>
                                    <span className="text-[10px] text-slate-400 block">Prior to this job</span>
                                </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-white">--</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
