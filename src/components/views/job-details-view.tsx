import { useState, useMemo, useEffect } from 'react';
import { type EnrichedShiftRecord, type BufferConfig } from '../../types';
import { processWarehouseLogic } from '../../logic/warehouse-transform';
import { ChevronRight, ChevronDown, Archive, AlertTriangle, User, Search, Printer, Download, Clock, Filter, Activity, Box, Truck, Layers, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { JobDetailPanel } from '../job-detail-panel';
import { RichTooltip } from '../ui/rich-tooltip';

interface JobDetailsViewProps {
    data: EnrichedShiftRecord[];
    config: BufferConfig;
}

export function JobDetailsView({ data, config }: JobDetailsViewProps) {
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [simulationMode, setSimulationMode] = useState<'actual' | 'standard' | 'target'>('actual');

    // 1. Process Data using Legacy Logic (Standards)
    const { activities, tasksByUser, stats, users } = useMemo(() => {
        // Run the core logic to get standardized objects
        const { tasks: allTasks, activities: allActivities } = processWarehouseLogic(data, config);

        // Generate Users List
        const users = Array.from(new Set(allActivities.map(a => a.User))).sort();

        // Filter Key Generation helper
        const getFilterKey = (t: any) => `${t.User} ${t.JobCode}`.toLowerCase();

        // Filter Logic
        const filteredActivities = allActivities.filter(a => {
            const matchesUser = selectedUser === 'ALL' || a.User === selectedUser;
            const matchesSearch = searchTerm === '' || getFilterKey(a).includes(searchTerm.toLowerCase());
            return matchesUser && matchesSearch;
        });

        // Optimization: Group tasks by USER (O(N)) instead of per-activity filtering (O(N^2))
        const tasksByUser = new Map<string, typeof allTasks>();
        allTasks.forEach(t => {
            if (!tasksByUser.has(t.User)) tasksByUser.set(t.User, []);
            tasksByUser.get(t.User)!.push(t);
        });

        // Calculate Global Stats from Filtered Activities
        const totalTime = filteredActivities.reduce((acc, a) => acc + (a.Finish.getTime() - a.Start.getTime()) / 1000, 0);
        const totalProc = filteredActivities.reduce((acc, a) => acc + a.ProductiveDurationSec, 0);
        const totalDirect = filteredActivities.reduce((acc, a) => acc + a.TaskDirectTimeSec, 0);
        const totalTravel = filteredActivities.reduce((acc, a) => acc + a.TaskTravelTimeSec, 0);
        // Remainder-based: ensures Direct + Travel + Unprod = 100% of Time Span
        const totalUnprod = Math.max(0, totalTime - totalDirect - totalTravel);

        // Efficiency = Direct / (Direct + Unproductive)? Or Productive / TotalSpan?
        // Spec: Efficiency = (Active Time / Net Duration) * 100

        const totalTasksCount = filteredActivities.reduce((acc, a) => acc + a.NofTasks, 0);

        return {
            activities: filteredActivities,
            tasksByUser,
            stats: { totalTime, totalTasks: totalTasksCount, totalProc, totalDirect, totalTravel, totalUnprod },
            users
        };

    }, [data, config, searchTerm, selectedUser]); // C1 FIX: config included — engineeredStandards, breakThreshold, travelRatio all affect output

    // 2. Transformation: Simulated Timeline (Standard / Target)
    const { simulatedActivities, simulatedTasksByUser, simulatedStats } = useMemo(() => {
        if (simulationMode === 'actual') {
            return {
                simulatedActivities: activities,
                simulatedTasksByUser: tasksByUser,
                simulatedStats: stats
            };
        }

        const newActivities: typeof activities = [];
        const newTasksByUser = new Map<string, any[]>();

        // We simulate per user
        users.forEach(u => {
            const userActivities = activities.filter(a => a.User === u);
            // Ignore injected breaks because we will recalculate all gaps based on simulation
            const productiveJobs = userActivities.filter(a => a.JobCode !== 'Break' && a.Activity !== 'Break' && a.Activity !== 'No Activity');
            productiveJobs.sort((a, b) => a.Start.getTime() - b.Start.getTime());

            const uTasks = tasksByUser.get(u) || [];
            const newUTasks: typeof uTasks = [];

            let lastSimFinish: Date | null = null;

            // Helper to get tasks for a job (mirroring standard logic)
            const getJobTasks = (act: any) => {
                return uTasks.filter((t: any) => {
                    const inTimeRange = t.Start >= act.Start && t.Finish <= act.Finish;
                    if (!inTimeRange) return false;
                    if (act.JobCode && act.JobCode !== 'Break') return t.JobCode === act.JobCode;
                    return t.JobCode === 'Unassigned' || t.JobCode === 'Break' || t.JobType === 'Break' || t.TaskType === 'Implicit Break/Delay';
                });
            };

            productiveJobs.forEach(job => {
                const tasksForThisJobRaw = getJobTasks(job);
                // Exclude breaks that might have leaked in, we only sequence productive tasks
                const tasksForThisJob = tasksForThisJobRaw.filter(t => t.JobType !== 'Break' && t.TaskType !== 'Implicit Break/Delay');
                tasksForThisJob.sort((a, b) => a.Start.getTime() - b.Start.getTime());

                // 1. Determine Continuous Anchor Time
                // - First job anchors to actual Start time
                // - Subsequent jobs anchor to the finish time of the previous simulated job (no gaps)
                let currentSimTime = lastSimFinish !== null ? new Date(lastSimFinish.getTime()) : new Date(job.Start);
                let jobSimStart = new Date(currentSimTime.getTime());

                let jobDirect = 0;
                let jobTravel = 0;

                tasksForThisJob.forEach(t => {
                    let taskDurSec = 0;
                    if (simulationMode === 'standard') {
                        // In standard/target mode, unprod is stripped, we only care about engineered pace
                        taskDurSec = (t.TaskDirectTimeStandardSec || 0) + (t.TaskTravelTimeStandardSec || 0);
                    } else if (simulationMode === 'target') {
                        taskDurSec = (t.TaskDirectTimeTargetSec || 0) + (t.TaskTravelTimeTargetSec || 0);
                    }

                    // Fallback to actual if standards are missing (prevents timeline collapse)
                    if (taskDurSec === 0) {
                        taskDurSec = t.ProductiveDurationSec + t.UnproductiveDurationSec;
                    }

                    const tStart = new Date(currentSimTime);
                    const tFinish = new Date(currentSimTime.getTime() + taskDurSec * 1000);

                    let newT = { ...t, Start: tStart, Finish: tFinish };

                    // Override durations for expanded view rendering
                    newT.ProductiveDurationSec = simulationMode === 'standard' ? (t.TaskDirectTimeStandardSec || 0) : (t.TaskDirectTimeTargetSec || 0);
                    newT.TaskDirectTimeSec = simulationMode === 'standard' ? (t.TaskDirectTimeStandardSec || 0) : (t.TaskDirectTimeTargetSec || 0);
                    newT.TaskTravelTimeSec = simulationMode === 'standard' ? (t.TaskTravelTimeStandardSec || 0) : (t.TaskTravelTimeTargetSec || 0);
                    newT.UnproductiveDurationSec = 0; // Purely simulated pace

                    if (newT.ProductiveDurationSec === 0 && newT.TaskTravelTimeSec === 0) {
                        newT.ProductiveDurationSec = t.ProductiveDurationSec;
                        newT.TaskDirectTimeSec = t.TaskDirectTimeSec;
                        newT.TaskTravelTimeSec = t.TaskTravelTimeSec;
                    }

                    newUTasks.push(newT);
                    jobDirect += newT.TaskDirectTimeSec;
                    jobTravel += newT.TaskTravelTimeSec;

                    currentSimTime = tFinish;
                });

                // 3. Create the Job Activity based on simulated times
                const jobSimFinish = currentSimTime;
                lastSimFinish = jobSimFinish;

                if (tasksForThisJob.length === 0) {
                    lastSimFinish = job.Finish;
                    newActivities.push(job);
                } else {
                    const newJob = {
                        ...job,
                        Start: jobSimStart,
                        Finish: jobSimFinish,
                        ProductiveDurationSec: jobDirect,
                        TaskDirectTimeSec: jobDirect,
                        TaskTravelTimeSec: jobTravel,
                        UnproductiveDurationSec: 0,
                    };
                    newActivities.push(newJob);
                }
            });

            newTasksByUser.set(u, newUTasks);
        });

        const totalTime = newActivities.reduce((acc, a) => acc + (a.Finish.getTime() - a.Start.getTime()) / 1000, 0);
        const productiveActivities = newActivities.filter(a => a.Activity !== 'Break' && a.Activity !== 'No Activity'); // S5 FIX: exclude breaks from task count
        const totalProc = newActivities.reduce((acc, a) => acc + a.ProductiveDurationSec, 0);
        const totalDirect = newActivities.reduce((acc, a) => acc + a.TaskDirectTimeSec, 0);
        const totalTravel = newActivities.reduce((acc, a) => acc + a.TaskTravelTimeSec, 0);
        // Remainder-based: ensures Direct + Travel + Unprod = 100% of Time Span
        const totalUnprod = Math.max(0, totalTime - totalDirect - totalTravel);
        const totalTasksCount = productiveActivities.reduce((acc, a) => acc + a.NofTasks, 0);

        return {
            simulatedActivities: newActivities,
            simulatedTasksByUser: newTasksByUser,
            simulatedStats: { totalTime, totalTasks: totalTasksCount, totalProc, totalDirect, totalTravel, totalUnprod }
        };
    }, [activities, tasksByUser, simulationMode, users]);

    const getTasks = (act: any) => {
        const userTasks = simulatedTasksByUser.get(act.User) || [];
        return userTasks.filter((t: any) => {
            const inTimeRange = t.Start >= act.Start && t.Finish <= act.Finish;
            if (!inTimeRange) return false;

            if (act.JobCode && act.JobCode !== 'Break') {
                // Named job: only include tasks that belong to this job
                // (intra-job breaks inherit the parent JobCode, so they'll match)
                return t.JobCode === act.JobCode;
            }
            // Unassigned/Break activity: only show tasks that are themselves Unassigned or Break-type
            // This prevents picking tasks from neighboring jobs from leaking in via boundary timestamps
            return t.JobCode === 'Unassigned' || t.JobCode === 'Break' || t.JobType === 'Break' || t.TaskType === 'Implicit Break/Delay';
        });
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedJobs);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedJobs(next);
    };

    // Format Helpers
    const fmtDur = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Pagination Logic
    const totalPages = Math.ceil(simulatedActivities.length / itemsPerPage);
    const paginatedActivities = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return simulatedActivities.slice(start, start + itemsPerPage);
    }, [simulatedActivities, currentPage, itemsPerPage]);

    // S2 FIX: useEffect for side-effects, not useMemo
    useEffect(() => {
        setCurrentPage(1);
    }, [simulatedActivities.length]);

    // --- RENDER ---
    return (
        <div className="bg-[#0F1115] min-h-screen text-slate-300 font-sans p-6">

            {/* 1. BREADCRUMBS & HEADER */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-medium">
                    <span className="hover:text-slate-300 cursor-pointer">Home</span> /
                    <span className="hover:text-slate-300 cursor-pointer">Audits</span> /
                    <span className="text-slate-300">Chronological User Audit</span>
                </div>
                <div className="flex justify-between items-end">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Timeline Forensic Audit</h1>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1D21] hover:bg-[#25292E] border border-slate-800 rounded-lg text-xs font-bold text-slate-300 transition-colors">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-900/20 transition-all">
                            <Download className="w-4 h-4" /> Export Report
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. DASHBOARD CONTEXT ROW */}
            <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* User Selector & Summary */}
                <div className="lg:col-span-8 bg-[#15171B] border border-slate-800 rounded-xl p-5 shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                                    <User className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#15171B] rounded-full"></div>
                            </div>
                            <div>
                                <select
                                    className="bg-[#111418] text-white font-bold text-lg border-none focus:ring-0 p-0 cursor-pointer hover:text-blue-400 transition-colors"
                                    style={{ colorScheme: 'dark' }}
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="ALL" className="bg-[#111418] text-white">All Warehouse Users</option>
                                    {users.map(u => (
                                        <option key={u} value={u} className="bg-[#111418] text-white">{u}</option>
                                    ))}
                                </select>
                                <div className="text-xs text-slate-500 font-mono mt-1">
                                    {selectedUser === 'ALL'
                                        ? `${users.length} Active Users • ${data[0]?.Warehouse || 'Unknown Warehouse'}`
                                        : `User ${selectedUser} • ${data.find(d => d.User === selectedUser)?.Warehouse || 'Unknown Warehouse'}`
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search timeline..."
                                    className="bg-[#0A0C0E] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="p-2 bg-[#0A0C0E] border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700">
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Simulation Mode Toggle (Radio Group) */}
                    <div className="flex bg-[#0A0C0E] p-1 rounded-lg border border-slate-800 self-start mb-6 w-fit">
                        {(['actual', 'standard', 'target'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setSimulationMode(mode)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${simulationMode === mode
                                    ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Separation Line */}
                    <div className="h-px bg-slate-800 mb-6"></div>

                    {/* Efficiency Breakdown Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                            <span>User Efficiency Breakdown</span>
                            <RichTooltip content={
                                <div className="space-y-1">
                                    <div className="font-bold">Total Time Span</div>
                                    <div className="text-[10px] text-slate-300">Sum of the durations (Finish - Start) for all active jobs and breaks currently visible based on active filters.</div>
                                </div>
                            }>
                                <span className="text-slate-500 cursor-help border-b border-dashed border-slate-600 hover:text-slate-300 transition-colors">Time Span for Outbound: {fmtDur(simulatedStats.totalTime)}</span>
                            </RichTooltip>
                        </div>
                        <div className="h-3 w-full bg-[#0A0C0E] rounded-full overflow-hidden flex">
                            <RichTooltip
                                className="h-full"
                                style={{ width: `${simulatedStats.totalTime > 0 ? Math.max(0, (simulatedStats.totalDirect / simulatedStats.totalTime) * 100) : 0}%` }}
                                content={<span className="font-bold">Direct Process: {simulatedStats.totalTime > 0 ? ((simulatedStats.totalDirect / simulatedStats.totalTime) * 100).toFixed(1) : '0.0'}% ({fmtDur(simulatedStats.totalDirect)})</span>}
                            >
                                <div className="w-full h-full bg-emerald-500" />
                            </RichTooltip>

                            <RichTooltip
                                className="h-full"
                                style={{ width: `${simulatedStats.totalTime > 0 ? Math.max(0, (simulatedStats.totalTravel / simulatedStats.totalTime) * 100) : 0}%` }}
                                content={<span className="font-bold">Travel: {simulatedStats.totalTime > 0 ? ((simulatedStats.totalTravel / simulatedStats.totalTime) * 100).toFixed(1) : '0.0'}% ({fmtDur(simulatedStats.totalTravel)})</span>}
                            >
                                <div className="w-full h-full bg-slate-500" />
                            </RichTooltip>

                            <RichTooltip
                                className="h-full"
                                style={{ width: `${simulatedStats.totalTime > 0 ? Math.max(0, (simulatedStats.totalUnprod / simulatedStats.totalTime) * 100) : 0}%` }}
                                content={<span className="font-bold">{simulatedStats.totalUnprod < 0 ? 'Negative Break (Saved)' : 'Unproductive / Gaps'}: {simulatedStats.totalTime > 0 ? ((simulatedStats.totalUnprod / simulatedStats.totalTime) * 100).toFixed(1) : '0.0'}% ({fmtDur(Math.abs(simulatedStats.totalUnprod))})</span>}
                            >
                                <div className={`w-full h-full ${simulatedStats.totalUnprod < 0 ? 'bg-blue-400 opacity-60' : 'bg-rose-500'}`} />
                            </RichTooltip>
                        </div>
                        {/* Legend */}
                        <div className="flex gap-6 mt-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-300">Direct Process</span>
                                <span className="text-slate-500 ml-1">{fmtDur(simulatedStats.totalDirect)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-500" />
                                <span className="text-slate-300">Travel</span>
                                <span className="text-slate-500 ml-1">{fmtDur(simulatedStats.totalTravel)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${simulatedStats.totalUnprod < 0 ? 'bg-blue-400 opacity-60' : 'bg-rose-500'}`} />
                                <span className="text-slate-300">{simulatedStats.totalUnprod < 0 ? 'Negative Break (Saved)' : 'Unproductive / Gaps'}</span>
                                <span className={`ml-1 font-mono ${simulatedStats.totalUnprod < 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                                    {simulatedStats.totalUnprod < 0 ? '-' : ''}{fmtDur(Math.abs(simulatedStats.totalUnprod))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Card */}
                <div className="lg:col-span-4 bg-[#15171B] border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Task Duration</div>
                        <div className="text-4xl font-bold text-white tracking-tight">
                            {simulatedStats.totalTasks > 0 ? (simulatedStats.totalProc / simulatedStats.totalTasks).toFixed(1) : 0}<span className="text-2xl text-slate-500 ml-1">s</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg w-fit">
                        <Activity className="w-3 h-3" />
                        <span>Based on {simulatedStats.totalTasks} Tasks</span>
                    </div>
                </div>
            </div>

            {/* 3. HEADERS */}
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Job Code</div>
                <div className="col-span-1 border-l border-slate-800 pl-4 border-r pr-4 mr-2">Job Type</div>
                <div className="col-span-1">Activity</div>
                <div className="col-span-1 text-center">Tasks</div>
                <div className="col-span-2 text-center">Stats</div>
                <div className="col-span-2 text-right">Start Time</div>
                <div className="col-span-2 text-right">Finish Time</div>
                <div className="col-span-1 text-right">Duration</div>
            </div>

            {/* 4. JOB LIST (CARDS) */}
            <div className="max-w-7xl mx-auto space-y-3 pb-24">
                {paginatedActivities.map(act => {
                    const isExpanded = expandedJobs.has(act.id);
                    const getTypeColor = (t: string) => {
                        if (t.includes('pick')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                        if (t.includes('sort')) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
                        if (t.includes('pack')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
                        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
                    };
                    const typeStyle = getTypeColor(act.Activity.toLowerCase());
                    const duration = (act.Finish.getTime() - act.Start.getTime()) / 1000;

                    // Calc Efficiency: (Direct + Travel) / Duration
                    const activeSec = act.TaskDirectTimeSec + act.TaskTravelTimeSec;
                    const efficiency = duration > 0 ? Math.min(100, (activeSec / duration) * 100) : 0;

                    const isNegativeBreak = act.Activity === 'Break' && act.UnproductiveDurationSec < 0;

                    return (
                        <div key={act.id} className={`bg-[#15171B] border transition-all duration-200 rounded-lg overflow-hidden ${isExpanded ? 'border-blue-500/40 shadow-blue-900/10' :
                            isNegativeBreak ? 'border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]' :
                                'border-slate-800 hover:border-slate-700'
                            }`}>

                            {/* MASTER ROW */}
                            <div className={`grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-colors ${isNegativeBreak ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/20'
                                }`}
                                onClick={() => setSelectedJobId(act.id)}
                            >
                                {/* Status */}
                                <div className="col-span-1 flex items-center gap-3">
                                    <button
                                        className={`w-6 h-6 rounded flex items-center justify-center transition-transform ${isExpanded ? 'bg-slate-800 rotate-90 text-white' : 'bg-transparent text-slate-500'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(act.id); }}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Job Code */}
                                <div className="col-span-1 text-sm font-bold text-white font-mono tracking-wide truncate">
                                    {act.JobCode || 'Unassigned'}
                                </div>
                                {/* Job Type */}
                                <div className="col-span-1 border-l border-slate-800 pl-4 border-r pr-4 mr-2">
                                    <span className="text-xs font-bold text-slate-400 tracking-wide truncate block">{act.JobType || 'Unknown'}</span>
                                </div>
                                {/* Activity Type */}
                                <div className="col-span-1">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${isNegativeBreak ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : typeStyle
                                        } truncate block text-center`}>
                                        {isNegativeBreak ? 'TIME SAVED' : (act.Activity.split('|')[0] || 'N/A')}
                                    </span>
                                </div>
                                {/* Tasks */}
                                <div className="col-span-1 text-center text-sm font-bold text-slate-300">{act.NofTasks}</div>

                                {/* NEW: Stats Badges (Units / Orders) */}
                                <div className="col-span-2 flex justify-center gap-2">
                                    <RichTooltip content={<span className="font-bold">Total Units Processed</span>}>
                                        <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 cursor-help hover:bg-slate-700/50 transition-colors">
                                            <Box className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[10px] font-mono text-slate-300">{act.NofUnits}</span>
                                        </div>
                                    </RichTooltip>
                                    <RichTooltip content={<span className="font-bold">Total Orders Processed</span>}>
                                        <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 cursor-help hover:bg-slate-700/50 transition-colors">
                                            <Layers className="w-3 h-3 text-blue-500" />
                                            <span className="text-[10px] font-mono text-slate-300">{act.NofOrders}</span>
                                        </div>
                                    </RichTooltip>
                                </div>

                                {/* Times */}
                                <div className="col-span-2 text-right text-xs font-mono text-slate-400">{format(act.Start, 'hh:mm:ss a')}</div>
                                <div className="col-span-2 text-right text-xs font-mono text-slate-400">{format(act.Finish, 'hh:mm:ss a')}</div>
                                {/* Duration */}
                                <div className={`col-span-1 text-right text-sm font-bold ${isNegativeBreak ? 'text-emerald-400' : 'text-white'}`}>
                                    {isNegativeBreak ? `-${fmtDur(Math.abs(act.UnproductiveDurationSec))}` : fmtDur(duration)}
                                </div>
                            </div>

                            {/* DETAIL VIEW (EXPANDED) */}
                            {isExpanded && (
                                <div className="bg-[#0A0C0E] border-t border-slate-800 p-4 animate-in slide-in-from-top-1">
                                    {/* Inner Header */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[9px] uppercase font-bold text-slate-600 border-b border-slate-800 mb-2">
                                        <div className="col-span-1">Type</div>
                                        <div className="col-span-3">SKU / Activity</div>
                                        <div className="col-span-3">Location / Batch Status</div>
                                        <div className="col-span-1 text-right">Start</div>
                                        <div className="col-span-1 text-right">Finish</div>
                                        <div className="col-span-1 text-right">Direct</div>
                                        <div className="col-span-1 text-right">Travel</div>
                                        <div className="col-span-1 text-right">Unprod</div>
                                    </div>
                                    <div className="space-y-1">
                                        {getTasks(act).map((t: any, i: number) => {
                                            const isIdle = t.TaskType === 'No Activity';
                                            const isBreak = t.TaskType === 'Break' || t.TaskType === 'Implicit Break/Delay' || t.JobType === 'Break';
                                            const isBatch = t.IsBatchNormalized;

                                            if (isIdle || isBreak) {
                                                const dur = t.OriginalDurationSec; // FIX: Use Original Duration for gaps/idle
                                                return (
                                                    <div key={i} className={`grid grid-cols-12 gap-4 px-4 py-2 rounded border items-center ${isBreak ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800/30 border-slate-800'}`}>
                                                        <div className="col-span-1">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex w-fit items-center gap-1 ${isBreak ? 'text-rose-400 border-rose-500/20' : 'text-slate-500 border-slate-700/50'}`}>
                                                                {isBreak ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                                {isBreak ? 'Brk' : 'Idle'}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-6 text-xs text-rose-300/70 italic">
                                                            {isBreak ? 'Scheduled Break' : `Non-Productive Time (Gap > ${config.breakThreshold || 300}s)`}
                                                        </div>
                                                        <div className="col-span-1 text-right text-xs font-mono text-slate-500">{format(t.Start, 'HH:mm:ss')}</div>
                                                        <div className="col-span-1 text-right text-xs font-mono text-slate-500">{format(t.Finish, 'HH:mm:ss')}</div>
                                                        <div className="col-span-3 text-right text-xs font-bold text-rose-400">{dur.toFixed(0)}s</div>
                                                    </div>
                                                );
                                            }

                                            // Productive Row
                                            return (
                                                <div key={i} className="grid grid-cols-12 gap-4 px-4 py-2 hover:bg-slate-800/50 rounded transition-colors items-center border-b border-slate-900/50 last:border-0">
                                                    <div className="col-span-1">
                                                        <span className="text-[9px] font-bold text-blue-400 border border-blue-900/50 bg-blue-900/20 px-1.5 py-0.5 rounded uppercase truncate flex items-center justify-center gap-1 text-center">
                                                            {t.IsSimultaneous && <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />}
                                                            {t.TaskType.substring(0, 4)}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <div className="text-xs font-bold text-slate-200 font-mono">{t.SKU}</div>
                                                        {t.OrderCode && t.OrderCode !== 'Unknown' && (
                                                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">ORD: {t.OrderCode}</div>
                                                        )}
                                                    </div>
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <div className="text-xs text-slate-500 font-mono">{t.Location}</div>
                                                        {isBatch && (
                                                            <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.5">
                                                                <Layers className="w-3 h-3 text-indigo-400" />
                                                                <span className="text-[9px] text-indigo-300 font-bold">Batch {t.BatchSize}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 text-right text-xs text-slate-500 font-mono">{format(t.Start, 'HH:mm:ss')}</div>
                                                    <div className="col-span-1 text-right text-xs text-slate-500 font-mono">{format(t.Finish, 'HH:mm:ss')}</div>

                                                    {/* Metrics Columns */}
                                                    <div className="col-span-1 text-right text-xs font-bold text-emerald-400">{t.TaskDirectTimeSec.toFixed(0)}s</div>
                                                    <div className="col-span-1 text-right text-xs font-bold text-blue-400">{t.TaskTravelTimeSec > 0 ? `${t.TaskTravelTimeSec.toFixed(0)}s` : '-'}</div>
                                                    <div className="col-span-1 text-right text-xs font-bold text-rose-400">{t.UnproductiveDurationSec > 0 ? `${t.UnproductiveDurationSec.toFixed(0)}s` : '-'}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls (Fixed Bottom) */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0F1115]/95 backdrop-blur-md border-t border-slate-800 p-4 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-slate-500 font-mono">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, simulatedActivities.length)} of {simulatedActivities.length} Records
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="bg-[#1A1D21] border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value={25} className="bg-[#111418] text-slate-300">25 / page</option>
                            <option value={50} className="bg-[#111418] text-slate-300">50 / page</option>
                            <option value={100} className="bg-[#111418] text-slate-300">100 / page</option>
                        </select>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-[#1A1D21] border border-slate-700 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-mono text-slate-400 px-2">
                                Page {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-[#1A1D21] border border-slate-700 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. SIDE PANEL */}
            {selectedJobId && simulatedActivities.find(a => a.id === selectedJobId) && (
                <JobDetailPanel
                    job={simulatedActivities.find(a => a.id === selectedJobId)!}
                    tasks={getTasks(simulatedActivities.find(a => a.id === selectedJobId)!)}
                    onClose={() => setSelectedJobId(null)}
                />
            )}

        </div>
    );
}
