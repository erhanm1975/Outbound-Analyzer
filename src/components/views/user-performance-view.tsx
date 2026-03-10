import { useState, useMemo } from 'react';
import { type UserPerformanceStats, type ShiftRecord } from '../../types';
import { extractInitials } from '../../lib/utils';
import { Trophy, TrendingUp, TrendingDown, Clock, Activity, ArrowUp, ArrowDown, Timer, BarChart3, ArrowUpDown, Shield } from 'lucide-react';
import { RichTooltip } from '../ui/rich-tooltip';
import { METRIC_TOOLTIPS } from '../../logic/metric-definitions';
import { useHelp } from '../../contexts/help-context';
import { EmployeeGuide } from '../guide/employee-guide';
import { bucketRecords, type IntervalOption } from '../../logic/flow-utils';

interface UserPerformanceViewProps {
    data: UserPerformanceStats[];
    rawRecords: ShiftRecord[];
}

type MetricMode = 'volume' | 'tasks';

const PROCESS_FILTERS = {
    picking: 'picking',
    sorting: 'sort',
    packing: 'packing',
};

// We will map the dynamic metric data into a rich interface for the table
interface DynamicUserStats extends UserPerformanceStats {
    pickFlowUph: number;
    sortFlowUph: number;
    packFlowUph: number;
    normalizedUph: number;
    dynamicMetric: number; // total units/tasks logged 
    activeIntervals: number;
    dynamicRank: number;
}

export function UserPerformanceView({ data, rawRecords }: UserPerformanceViewProps) {
    const { openHelp } = useHelp();
    const [intervalMin, setIntervalMin] = useState<IntervalOption>(30);
    const [metricMode, setMetricMode] = useState<MetricMode>('volume');

    const [sortField, setSortField] = useState<keyof DynamicUserStats>('normalizedUph');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (field: keyof DynamicUserStats) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc'); // Default to desc for metrics
        }
    };

    const isVolume = metricMode === 'volume';
    const metricLabel = isVolume ? 'Volume' : 'Tasks';

    // 1-2. Compute Flow Data for ALL THREE processes simultaneously
    const flowDataMemo = useMemo(() => {
        if (!rawRecords || rawRecords.length === 0) return { pick: null, sort: null, pack: null, combined: null };

        const validRecs = rawRecords.filter(r => {
            const t = (r.TaskType || '').toLowerCase();
            return t.includes(PROCESS_FILTERS.picking) || t.includes(PROCESS_FILTERS.sorting) || t.includes(PROCESS_FILTERS.packing);
        });

        const pickRecs = validRecs.filter(r => (r.TaskType || '').toLowerCase().includes(PROCESS_FILTERS.picking));
        const sortRecs = validRecs.filter(r => (r.TaskType || '').toLowerCase().includes(PROCESS_FILTERS.sorting));
        const packRecs = validRecs.filter(r => (r.TaskType || '').toLowerCase().includes(PROCESS_FILTERS.packing));

        return {
            pick: bucketRecords(pickRecs, intervalMin),
            sort: bucketRecords(sortRecs, intervalMin),
            pack: bucketRecords(packRecs, intervalMin),
            combined: bucketRecords(validRecs, intervalMin),
        };
    }, [rawRecords, intervalMin]);

    // 3. Map dynamic flow computations back into the user array and compute coefficients
    const userFlowStats = useMemo(() => {
        if (!flowDataMemo.pick) return { merged: [], coeffs: { sortCoeff: 1, packCoeff: 1, pickBaseline: 1, sortAvg: 0, packAvg: 0 } };
        const multiplier = 60 / intervalMin;

        // Helper to extract stats
        const extractStats = (flowData: any) => {
            const map = new Map<string, { total: number, activeIntervals: number, flowUph: number }>();
            let globalTotalUph = 0;
            let globalActiveUsers = 0;

            flowData.allUsers.forEach((user: string) => {
                let total = 0;
                let activeIntervals = 0;
                flowData.intervals.forEach((interval: any) => {
                    const val = isVolume ? (interval.users[user] || 0) : (interval.userTasks[user] || 0);
                    total += val;
                    if (val > 0) activeIntervals++;
                });
                const flowUph = activeIntervals > 0 ? Math.round((total / activeIntervals) * multiplier) : 0;
                map.set(user, { total, activeIntervals, flowUph });

                if (flowUph > 0) {
                    globalTotalUph += flowUph;
                    globalActiveUsers++;
                }
            });

            const avgFlowUph = globalActiveUsers > 0 ? Math.round(globalTotalUph / globalActiveUsers) : 0;
            return { map, avgFlowUph };
        };

        const pickStats = extractStats(flowDataMemo.pick);
        const sortStats = extractStats(flowDataMemo.sort);
        const packStats = extractStats(flowDataMemo.pack);
        const combinedStats = extractStats(flowDataMemo.combined);

        // Derive Coefficients based on Picking as normalizer (1.0)
        const pickBaseline = pickStats.avgFlowUph || 1; // avoid divide by zero if completely empty
        const sortCoeff = sortStats.avgFlowUph > 0 ? (pickBaseline / sortStats.avgFlowUph) : 1;
        const packCoeff = packStats.avgFlowUph > 0 ? (pickBaseline / packStats.avgFlowUph) : 1;

        // Merge back into original data
        let merged: DynamicUserStats[] = data.map(baseUser => {
            const pInfo = pickStats.map.get(baseUser.user) || { total: 0, flowUph: 0 };
            const sInfo = sortStats.map.get(baseUser.user) || { total: 0, flowUph: 0 };
            const pkInfo = packStats.map.get(baseUser.user) || { total: 0, flowUph: 0 };
            const cInfo = combinedStats.map.get(baseUser.user) || { total: 0, activeIntervals: 0, flowUph: 0 };

            // Normalized Formula
            const normalizedUph = Math.round(
                (pInfo.flowUph * 1.0) +
                (sInfo.flowUph * sortCoeff) +
                (pkInfo.flowUph * packCoeff)
            );

            return {
                ...baseUser,
                pickFlowUph: pInfo.flowUph,
                sortFlowUph: sInfo.flowUph,
                packFlowUph: pkInfo.flowUph,
                normalizedUph,
                dynamicMetric: cInfo.total,
                activeIntervals: cInfo.activeIntervals,
                dynamicRank: 0
            };
        });

        // Filter and Rank
        merged = merged.filter(u => u.dynamicMetric > 0);
        merged.sort((a, b) => b.normalizedUph - a.normalizedUph);
        merged.forEach((u, i) => u.dynamicRank = i + 1);

        return {
            merged,
            coeffs: { sortCoeff, packCoeff, pickBaseline, sortAvg: sortStats.avgFlowUph, packAvg: packStats.avgFlowUph },
            pickStats,
            sortStats,
            packStats
        };
    }, [flowDataMemo, data, isVolume, intervalMin]);

    const activeUsers = userFlowStats.merged || [];
    const { coeffs } = userFlowStats;

    // 4. Handle Sorting for the final UI
    const sortedData = useMemo(() => {
        return [...activeUsers].sort((a, b) => {
            let valA = a[sortField as keyof DynamicUserStats] ?? 0;
            let valB = b[sortField as keyof DynamicUserStats] ?? 0;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [activeUsers, sortField, sortDir]);

    // Top 3 Calculation 
    const topPerformers = useMemo(() => {
        return [...activeUsers].sort((a, b) => b.normalizedUph - a.normalizedUph).slice(0, 3);
    }, [activeUsers]);

    const lowPerformers = useMemo(() => {
        return [...activeUsers].sort((a, b) => a.normalizedUph - b.normalizedUph).filter(u => u.normalizedUph > 0).slice(0, 3);
    }, [activeUsers]);

    if (data.length === 0) return (
        <div className="flex items-center justify-center h-64 text-slate-400 bg-[#0d1117] rounded-xl border border-dashed border-slate-800">
            No user performance data available
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header Controls */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-slate-800/80 shadow-md">
                        <Timer className="w-3.5 h-3.5 text-slate-500 ml-2" />
                        {([15, 30, 60] as IntervalOption[]).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setIntervalMin(opt)}
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${intervalMin === opt
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {opt}m
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-slate-800/80 shadow-md">
                        <BarChart3 className="w-3.5 h-3.5 text-slate-500 ml-2" />
                        {(['volume', 'tasks'] as MetricMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setMetricMode(mode)}
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all capitalize ${metricMode === mode
                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex gap-4 mr-4 text-[10px] text-slate-500 font-mono tracking-tight bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
                        <span className="flex items-center"><Shield className="w-3 h-3 mr-1 text-emerald-500" /> Coefficients:</span>
                        <span>Pick=1.00 ({coeffs?.pickBaseline})</span>
                        <span>Sort={coeffs?.sortCoeff?.toFixed(2) || '1.00'} ({coeffs?.sortAvg || 0})</span>
                        <span>Pack={coeffs?.packCoeff?.toFixed(2) || '1.00'} ({coeffs?.packAvg || 0})</span>
                    </div>

                    <button
                        onClick={() => openHelp(<EmployeeGuide />)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">menu_book</span>
                        Employee Performance Guide
                    </button>
                </div>
            </div>

            {/* Highlights Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 3 */}
                <div className="bg-gradient-to-br from-indigo-950/40 to-[#111418] border border-indigo-900/40 rounded-xl p-5 shadow-none">
                    <h3 className="text-sm font-semibold text-indigo-300 mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Top Performers (Normalized)
                    </h3>
                    <div className="space-y-3">
                        {topPerformers.length > 0 ? topPerformers.map((user, idx) => (
                            <div key={user.user} className="flex items-center justify-between p-2 bg-[#111418] rounded-lg border border-indigo-900/30 shadow-none relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400"></div>
                                <div className="flex items-center gap-3 pl-2">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-none
                                        ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : 'bg-amber-700'}
                                    `}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-100">{user.user}</div>
                                        <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5 mb-1">
                                            <span>Master Flow Score</span>
                                            <span>•</span>
                                            <span className="text-indigo-300">{user.activeIntervals} Active Intervals</span>
                                        </div>
                                        <div className="flex gap-3 text-[10px] font-mono mt-1 pt-1 border-t border-indigo-500/10">
                                            <span className="text-indigo-300">Pick {user.pickFlowUph}</span>
                                            <span className="text-purple-300">Sort {user.sortFlowUph}</span>
                                            <span className="text-amber-300">Pack {user.packFlowUph}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-400 leading-none">{user.normalizedUph}</div>
                                    <div className="text-[10px] font-medium text-emerald-500/80">Norm. UPH</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-700/50 rounded-lg">No data available</div>
                        )}
                    </div>
                </div>

                {/* Lowest 3 */}
                <div className="bg-[#111418] border border-slate-800 rounded-xl p-5 shadow-none">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                        Needs Attention (Normalized)
                    </h3>
                    <div className="space-y-3">
                        {lowPerformers.length > 0 ? lowPerformers.map((user, idx) => (
                            <div key={user.user} className="flex items-center justify-between p-2 bg-[#111418] rounded-lg border border-slate-800 shadow-none">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium shrink-0">
                                        {extractInitials(user.user)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-300">{user.user}</div>
                                        <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5 mb-1">
                                            <span>Master Flow Score</span>
                                            <span>•</span>
                                            <span className="text-slate-500">{user.activeIntervals} Active Intervals</span>
                                        </div>
                                        <div className="flex gap-3 text-[10px] font-mono mt-1 pt-1 border-t border-slate-700/50">
                                            <span className="text-indigo-900/80">Pick {user.pickFlowUph}</span>
                                            <span className="text-purple-900/80">Sort {user.sortFlowUph}</span>
                                            <span className="text-amber-900/80">Pack {user.packFlowUph}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-rose-400 leading-none">{user.normalizedUph}</div>
                                    <div className="text-[10px] font-medium text-rose-500/80">Norm. UPH</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-700/50 rounded-lg">No data available</div>
                        )}
                    </div>
                </div>
            </div>            {/* Shift Averages Row */}
            <div className="bg-[#111418] border border-slate-800 rounded-xl p-4 shadow-none flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Shift Average Performance
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pick Flow UPH</span>
                        <span className="text-lg font-bold font-mono text-indigo-400">{userFlowStats.pickStats.avgFlowUph}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sort Flow UPH</span>
                        <span className="text-lg font-bold font-mono text-purple-400">{userFlowStats.sortStats.avgFlowUph}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pack Flow UPH</span>
                        <span className="text-lg font-bold font-mono text-amber-400">{userFlowStats.packStats.avgFlowUph}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">Master Norm. Score <RichTooltip content="Shift Average Neutralized UPH" /></span>
                        <span className="text-xl font-bold font-mono text-emerald-400">
                            {Math.round(
                                (userFlowStats.pickStats.avgFlowUph * 1.0) +
                                (userFlowStats.sortStats.avgFlowUph * (userFlowStats.coeffs.sortCoeff || 1)) +
                                (userFlowStats.packStats.avgFlowUph * (userFlowStats.coeffs.packCoeff || 1))
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-[#111418] rounded-xl border border-slate-800 shadow-none flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-[#0d1117]">
                    <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        Dynamic User Metrics
                        <span className="text-slate-400 text-xs font-normal">({sortedData.length} workers)</span>
                    </h3>
                    <div className="text-xs text-slate-400 italic">
                        Norm. UPH = (Pick * 1.0) + (Sort * Coeff) + (Pack * Coeff)
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#111418] text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="p-3 w-16 text-center cursor-pointer hover:bg-slate-800" onClick={() => handleSort('dynamicRank')}>
                                    <div className="flex items-center justify-center gap-1 group">
                                        Rank
                                        {sortField === 'dynamicRank' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('user')}>
                                    <div className="flex items-center gap-1 group">
                                        User {sortField === 'user' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800 bg-emerald-900/10" onClick={() => handleSort('normalizedUph')}>
                                    <div className="flex items-center justify-end gap-1 group text-emerald-300">
                                        Norm. UPH {sortField === 'normalizedUph' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        <RichTooltip content="Unified performance score neutralizing task difficulty differences." />
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('pickFlowUph')}>
                                    <div className="flex items-center justify-end gap-1 group text-indigo-200">
                                        Pick Flow UPH
                                        {sortField === 'pickFlowUph' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('sortFlowUph')}>
                                    <div className="flex items-center justify-end gap-1 group text-purple-200">
                                        Sort Flow UPH
                                        {sortField === 'sortFlowUph' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('packFlowUph')}>
                                    <div className="flex items-center justify-end gap-1 group text-amber-200">
                                        Pack Flow UPH
                                        {sortField === 'packFlowUph' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('dynamicMetric')}>
                                    <div className="flex items-center justify-end gap-1 group">
                                        Total {metricLabel} {sortField === 'dynamicMetric' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('activeIntervals')}>
                                    <div className="flex items-center justify-end gap-1 group">
                                        Active Ints {sortField === 'activeIntervals' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800 border-l border-slate-800/50" onClick={() => handleSort('uph')}>
                                    <div className="flex items-center justify-end gap-1 group opacity-60 hover:opacity-100">
                                        Overall Occ UPH {sortField === 'uph' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('utilization')}>
                                    <div className="flex items-center justify-end gap-1 group">
                                        Overall Util % {sortField === 'utilization' ? (sortDir === 'asc' ? <ArrowDown className="w-3 text-emerald-400" /> : <ArrowUp className="w-3 text-emerald-400" />) : <ArrowUpDown className="w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {sortedData.map((user) => (
                                <tr key={user.user} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-3 text-center text-slate-400 font-medium">#{user.dynamicRank}</td>
                                    <td className="p-3 font-medium text-slate-300">{user.user}</td>

                                    <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-900/10 group-hover:bg-emerald-900/20">{user.normalizedUph > 0 ? user.normalizedUph : '·'}</td>

                                    <td className="p-3 text-right text-indigo-300 font-medium">{user.pickFlowUph > 0 ? user.pickFlowUph : <span className="text-slate-700 font-normal">·</span>}</td>
                                    <td className="p-3 text-right text-purple-300 font-medium">{user.sortFlowUph > 0 ? user.sortFlowUph : <span className="text-slate-700 font-normal">·</span>}</td>
                                    <td className="p-3 text-right text-amber-300 font-medium">{user.packFlowUph > 0 ? user.packFlowUph : <span className="text-slate-700 font-normal">·</span>}</td>

                                    <td className="p-3 text-right text-slate-300 font-medium">{(user.dynamicMetric ?? 0).toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-400">{user.activeIntervals} <span className="text-[10px] text-slate-600 ml-1">({user.activeIntervals * intervalMin}m)</span></td>

                                    <td className="p-3 text-right text-slate-500 border-l border-slate-800/50 font-mono">{user.uph}</td>
                                    <td className="p-3 text-right">
                                        <span className={`
                                            px-2 py-0.5 rounded-full text-[10px] font-bold
                                            ${user.utilization > 85 ? 'bg-emerald-900/30 text-emerald-400' :
                                                user.utilization < 50 ? 'bg-rose-900/30 text-rose-400' : 'bg-slate-800 text-slate-400'}
                                        `}>
                                            {user.utilization}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
