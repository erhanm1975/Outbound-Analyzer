import { useState, useMemo } from 'react';
import { type EnrichedShiftRecord } from '../types';
import { ChevronRight, ChevronDown, Clock, Truck, ShoppingCart, User, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface JobDetailsViewProps {
    data: EnrichedShiftRecord[];
}

interface JobGroup {
    id: string; // user-jobcode-timestamp (unique key)
    user: string;
    jobCode: string;
    taskType: string;
    firstTaskStart: Date;
    lastTaskFinish: Date;
    durationSec: number;
    distinctLocations: number;
    interJobGapSec: number; // Gap leading INTO this job
    intraJobBreakSec: number; // accumulated breaks > 5min WITHIN the job
    tasks: EnrichedShiftRecord[];
}

export function JobDetailsView({ data }: JobDetailsViewProps) {
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
    const [maxItems, setMaxItems] = useState(50); // Pagination/Limit for performance

    const jobGroups = useMemo(() => {
        const groups: JobGroup[] = [];
        let currentGroup: JobGroup | null = null;

        const calculateIntraBreak = (tasks: EnrichedShiftRecord[]) => {
            let totalBreak = 0;
            for (let i = 1; i < tasks.length; i++) {
                const gap = (tasks[i].Start.getTime() - tasks[i - 1].Finish.getTime()) / 1000;
                if (gap > 300) totalBreak += gap; // > 5 mins
            }
            return totalBreak;
        };

        const getTaskTypeLabel = (tasks: EnrichedShiftRecord[]) => {
            const uniqueTypes = new Set(tasks.map(t => t.TaskType));
            if (uniqueTypes.size === 1) return Array.from(uniqueTypes)[0];

            const parts: string[] = [];
            const hasPick = tasks.some(t => t.TaskType?.toLowerCase().includes('pick'));
            const hasSort = tasks.some(t => t.TaskType?.toLowerCase().includes('sort'));
            const hasPack = tasks.some(t => t.TaskType?.toLowerCase().includes('pack'));

            if (hasPick) parts.push('P');
            if (hasSort) parts.push('S');
            if (hasPack) parts.push('P');

            return parts.length > 0 ? parts.join('|') : 'Mix';
        };

        // Ensure sorted by User
        const sortedData = [...data].sort((a, b) => a.User.localeCompare(b.User) || a.Start.getTime() - b.Start.getTime());

        sortedData.forEach((record, idx) => {
            const isNewJob = !currentGroup
                || currentGroup.user !== record.User
                || currentGroup.jobCode !== record.JobCode
                || record.gapType === 'TRANSITION';

            if (isNewJob) {
                if (currentGroup) {
                    // Finalize previous group
                    const group = currentGroup as JobGroup; // Assertion to help compiler
                    group.lastTaskFinish = group.tasks[group.tasks.length - 1].Finish;
                    group.durationSec = (group.lastTaskFinish.getTime() - group.firstTaskStart.getTime()) / 1000;
                    group.distinctLocations = new Set(group.tasks.map(t => t.Location)).size;
                    group.intraJobBreakSec = calculateIntraBreak(group.tasks);
                    group.taskType = getTaskTypeLabel(group.tasks);
                    groups.push(group);
                }

                currentGroup = {
                    id: `${record.User}-${record.JobCode}-${record.Start.getTime()}`,
                    user: record.User,
                    jobCode: record.JobCode,
                    taskType: '',
                    firstTaskStart: record.Start,
                    lastTaskFinish: record.Finish,
                    durationSec: 0,
                    distinctLocations: 0,
                    interJobGapSec: record.interJobGapSec || 0,
                    intraJobBreakSec: 0,
                    tasks: [record]
                };
            } else {
                if (currentGroup) {
                    (currentGroup as JobGroup).tasks.push(record);
                }
            }
        });

        if (currentGroup) {
            const group = currentGroup as JobGroup;
            group.lastTaskFinish = group.tasks[group.tasks.length - 1].Finish;
            group.durationSec = (group.lastTaskFinish.getTime() - group.firstTaskStart.getTime()) / 1000;
            group.distinctLocations = new Set(group.tasks.map(t => t.Location)).size;
            group.intraJobBreakSec = calculateIntraBreak(group.tasks);
            group.taskType = getTaskTypeLabel(group.tasks);
            groups.push(group);
        }

        return groups;
    }, [data]);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedJobs);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedJobs(next);
    };

    const displayedGroups = jobGroups.slice(0, maxItems);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-slate-800">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Archive className="w-6 h-6 text-purple-600" />
                    Job Forensic Audit
                </h3>
                <span className="text-sm text-slate-500">
                    Showing {displayedGroups.length} of {jobGroups.length} Jobs
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-1"></div> {/* Expand Arrow */}
                    <div className="col-span-2">User</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1">Job Code</div>
                    <div className="col-span-1 text-right">Tasks</div>
                    <div className="col-span-1 text-right">Inter-Job Gap</div>
                    <div className="col-span-1 text-right">Net Dur</div>
                    <div className="col-span-1 text-right">Avg Task Dur</div>
                    <div className="col-span-1 text-right">Breaks</div>
                    <div className="col-span-2 text-right">Start / Finish</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {displayedGroups.map(job => (
                        <div key={job.id} className="group transition-colors hover:bg-slate-50/50">
                            {/* Job Row */}
                            <div
                                className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer"
                                onClick={() => toggleExpand(job.id)}
                            >
                                <div className="col-span-1 flex justify-center">
                                    <button className="p-1 rounded-full hover:bg-slate-200 text-slate-400">
                                        {expandedJobs.has(job.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="col-span-2 font-medium text-slate-700 flex items-center gap-2 truncate" title={job.user}>
                                    <User className="w-3 h-3 text-slate-400" />
                                    {job.user}
                                </div>
                                <div className="col-span-1">
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 truncate block w-fit">
                                        {job.taskType}
                                    </span>
                                </div>
                                <div className="col-span-1 font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit truncate">
                                    {job.jobCode}
                                </div>
                                <div className="col-span-1 text-right font-medium text-slate-600 px-2">
                                    {job.tasks.length}
                                </div>
                                <div className="col-span-1 text-right font-medium flex justify-end items-center gap-1">
                                    {(() => {
                                        const gap = job.interJobGapSec;
                                        if (gap <= 0) return <span className="text-slate-300">-</span>;
                                        const min = gap / 60;
                                        if (min > 25) return <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded border border-rose-100" title="Likely Lunch Break">🍽️ {min.toFixed(0)}m</span>;
                                        if (min > 10) return <span className="text-orange-600 font-bold bg-orange-50 px-1 rounded border border-orange-100" title="Likely Rest Break">☕ {min.toFixed(0)}m</span>;
                                        if (min > 5) return <span className="text-amber-600 font-medium">{min.toFixed(1)}m</span>;
                                        return <span className="text-slate-400">{min.toFixed(1)}m</span>;
                                    })()}
                                </div>
                                <div className="col-span-1 text-right font-medium text-slate-700">
                                    {((job.durationSec - job.intraJobBreakSec) / 60).toFixed(2)}m
                                </div>
                                <div className="col-span-1 text-right font-medium text-emerald-600">
                                    {(() => {
                                        const isPicking = job.taskType === 'Picking';
                                        const denom = isPicking ? job.distinctLocations : job.tasks.length;
                                        const val = denom > 0 ? (job.durationSec - job.intraJobBreakSec) / denom : 0;
                                        return val > 0 ? `${val.toFixed(1)}s` : '-';
                                    })()}
                                </div>
                                <div className="col-span-1 text-right font-medium text-rose-600">
                                    {job.intraJobBreakSec > 0 ? (
                                        <span className="bg-rose-50 px-2 py-1 rounded border border-rose-100 font-bold text-xs">
                                            ⚠️ {(job.intraJobBreakSec / 60).toFixed(1)}m
                                        </span>
                                    ) : <span className="text-slate-300 text-xs">-</span>}
                                </div>
                                <div className="col-span-2 text-right text-xs text-slate-500">
                                    <div>{format(job.firstTaskStart, 'HH:mm:ss')}</div>
                                    <div className="text-slate-400">{format(job.lastTaskFinish, 'HH:mm:ss')}</div>
                                </div>
                            </div>

                            {/* Expanded Task Details */}
                            {expandedJobs.has(job.id) && (
                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                                    {/* Grouping Logic */}
                                    {(() => {
                                        const buckets: Record<string, EnrichedShiftRecord[]> = {
                                            'Picking': [],
                                            'Sorting': [],
                                            'Packing': [],
                                            'Other': []
                                        };
                                        job.tasks.forEach(t => {
                                            const type = t.TaskType?.toLowerCase() || '';
                                            if (type.includes('pick')) buckets['Picking'].push(t);
                                            else if (type.includes('sort')) buckets['Sorting'].push(t);
                                            else if (type.includes('pack')) buckets['Packing'].push(t);
                                            else buckets['Other'].push(t);
                                        });

                                        return Object.entries(buckets).map(([bucketName, tasks]) => {
                                            if (tasks.length === 0) return null;
                                            // Process Label: "Pick (s)", "Sort (s)", "Pack (s)"
                                            const actionLabel = bucketName === 'Other' ? 'Process (s)' : `${bucketName.slice(0, 4)} (s)`;

                                            // Buckets colors
                                            const headerColorStr = bucketName === 'Picking' ? 'text-blue-600 border-blue-200' :
                                                bucketName === 'Sorting' ? 'text-indigo-600 border-indigo-200' :
                                                    bucketName === 'Packing' ? 'text-purple-600 border-purple-200' : 'text-slate-500 border-slate-200';

                                            return (
                                                <div key={bucketName} className="mb-4 last:mb-0">
                                                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 border-b pb-1 ${headerColorStr}`}>
                                                        {bucketName} Tasks ({tasks.length})
                                                    </h4>
                                                    <table className="w-full text-xs text-slate-600">
                                                        <thead>
                                                            <tr className="text-slate-400 border-b border-slate-100">
                                                                <th className="text-left py-2 pl-2">Type</th>
                                                                <th className="text-left py-2">SKU</th>
                                                                <th className="text-left py-2">Location</th>
                                                                <th className="text-right py-2">Start</th>
                                                                <th className="text-right py-2">Finish</th>
                                                                <th className="text-right py-2">{actionLabel}</th>
                                                                <th className="text-right py-2 pr-2">Travel (s)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {tasks.map((task, i) => (
                                                                <tr key={i} className="hover:bg-slate-50">
                                                                    <td className="py-2 pl-2 font-mono text-[10px] text-slate-500">{task.TaskType}</td>
                                                                    <td className="py-2 font-mono text-xs font-medium text-slate-700">{task.SKU}</td>
                                                                    <td className="py-2 font-mono text-xs text-slate-600">{task.Location}</td>
                                                                    <td className="py-2 text-right font-mono text-slate-400">{format(task.Start, 'HH:mm:ss')}</td>
                                                                    <td className="py-2 text-right font-mono text-slate-400">{format(task.Finish, 'HH:mm:ss')}</td>
                                                                    <td className="py-2 text-right font-medium text-slate-700">{(task.processTimeSec ?? 0).toFixed(1)}</td>
                                                                    <td className="py-2 text-right text-slate-500 pr-2">{(task.travelTimeSec ?? 0) > 0 ? (task.travelTimeSec ?? 0).toFixed(1) : '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {displayedGroups.length < jobGroups.length && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                        <button
                            onClick={() => setMaxItems(prev => prev + 50)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            Load More Jobs...
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
