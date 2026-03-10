import { format } from 'date-fns';
import { type FlowDetailData, type ShiftRecord } from '../../types';
import { bucketRecords, type ExtendedFlowData, type ExtendedIntervalData, type IntervalOption } from '../../logic/flow-utils';
import { Activity, Users, Clock, Timer, BarChart3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { extractInitials } from '../../lib/utils';
import { useState, useMemo } from 'react';
import { TIME } from '../../config/constants';
import { useHelp } from '../../contexts/help-context';
import { FlowAuditGuide } from '../guide/flow-audit-guide';

interface ProcessData {
    data: FlowDetailData;
    score?: number;
    avgTaskDuration?: number;
}

interface DynamicFlowViewProps {
    rawRecords: ShiftRecord[];
    processes: {
        picking: ProcessData;
        sorting?: ProcessData;
        packing?: ProcessData;
    };
}
type ProcessKey = 'picking' | 'sorting' | 'packing';

type MetricMode = 'volume' | 'tasks';
type SortField = 'User' | 'Avg UPH' | 'Total' | 'Active';

const PROCESS_LABELS: Record<ProcessKey, string> = {
    picking: 'Picking',
    sorting: 'Sorting',
    packing: 'Packing',
};

const PROCESS_FILTERS: Record<ProcessKey, string> = {
    picking: 'picking',
    sorting: 'sort',
    packing: 'packing',
};


export function DynamicFlowView({ rawRecords, processes }: DynamicFlowViewProps) {
    const { openHelp } = useHelp();
    const [selectedProcess, setSelectedProcess] = useState<ProcessKey>('picking');
    const [intervalMin, setIntervalMin] = useState<IntervalOption>(30);
    const [metricMode, setMetricMode] = useState<MetricMode>('volume');
    const [sortField, setSortField] = useState<SortField>('Total');
    const [sortDesc, setSortDesc] = useState(true);

    // Available processes
    const availableProcesses = (Object.keys(PROCESS_LABELS) as ProcessKey[]).filter(
        key => processes[key] && processes[key]!.data.intervals.length > 0
    );

    const current = processes[selectedProcess];
    if (!current) return null;

    // Filter raw records for selected process
    const filteredRecords = useMemo(() => {
        const filter = PROCESS_FILTERS[selectedProcess];
        return rawRecords.filter(r => (r.TaskType || '').toLowerCase().includes(filter));
    }, [rawRecords, selectedProcess]);

    // Re-bucket based on selected interval
    const dynamicData = useMemo(() => {
        return bucketRecords(filteredRecords, intervalMin);
    }, [filteredRecords, intervalMin]);

    const { avgTaskDuration } = current;
    const processName = PROCESS_LABELS[selectedProcess];
    const score = current.score;
    const data = dynamicData;
    const isVolume = metricMode === 'volume';
    const metricLabel = isVolume ? 'Volume' : 'Tasks';

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDesc(!sortDesc);
        } else {
            setSortField(field);
            setSortDesc(true);
        }
    };

    const sortedIntervals = [...data.intervals].sort((a, b) => a.intervalStart.getTime() - b.intervalStart.getTime());

    // Helper: get cell value based on metric mode
    const getCellVal = (interval: ExtendedIntervalData, user?: string): number => {
        if (user) {
            return isVolume ? (interval.users[user] || 0) : (interval.userTasks[user] || 0);
        }
        return isVolume ? interval.volume : interval.taskCount;
    };

    // Find max cell value for heatmap
    let maxCellVol = 0;
    sortedIntervals.forEach(interval => {
        data.allUsers.forEach(user => {
            const val = getCellVal(interval, user);
            if (val > maxCellVol) maxCellVol = val;
        });
    });

    // Per-user totals + per-user Avg Flow UPH (always hourly)
    const multiplier = 60 / intervalMin;
    const userTotals = data.allUsers.map(user => {
        let total = 0;
        let activeIntervals = 0;
        sortedIntervals.forEach(interval => {
            const val = getCellVal(interval, user);
            total += val;
            if (val > 0) activeIntervals++;
        });
        const avgFlowUPH = activeIntervals > 0
            ? Math.round((total / activeIntervals) * multiplier)
            : 0;
        return { user, total, activeIntervals, avgFlowUPH };
    }).sort((a, b) => {
        let cmp = 0;
        if (sortField === 'User') cmp = a.user.localeCompare(b.user);
        else if (sortField === 'Avg UPH') cmp = a.avgFlowUPH - b.avgFlowUPH;
        else if (sortField === 'Total') cmp = a.total - b.total;
        else if (sortField === 'Active') cmp = a.activeIntervals - b.activeIntervals;
        return sortDesc ? -cmp : cmp;
    });

    // Shift-level Avg Flow UPH = average of all per-user hourly UPH values
    const activeUsers = userTotals.filter(u => u.activeIntervals > 0);
    const shiftAvgFlowUPH = activeUsers.length > 0
        ? Math.round(activeUsers.reduce((acc, u) => acc + u.avgFlowUPH, 0) / activeUsers.length)
        : 0;

    const totalMetric = sortedIntervals.reduce((acc, i) => acc + getCellVal(i), 0);



    // Prepare simple single-process array for Recharts (User Flow tab header stats)
    const chartData = sortedIntervals.map(interval => ({
        time: format(interval.intervalStart, 'HH:mm'),
        value: getCellVal(interval)
    }));

    return (
        <div className="space-y-6 p-6 bg-[#0F1115] min-h-full text-slate-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-500" />
                        Flow Audit
                    </h2>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-slate-500">
                            {intervalMin}-minute intervals · {metricLabel} heatmap
                        </p>
                        <button
                            onClick={() => openHelp(<FlowAuditGuide />)}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">menu_book</span>
                            Open Guide
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {avgTaskDuration !== undefined && (
                        <div className="bg-[#15171B] border border-slate-800 text-slate-300 px-5 py-3 rounded-xl flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Avg Task</span>
                            <span className="text-xl font-bold font-mono text-white">{avgTaskDuration} <span className="text-xs font-normal text-slate-500">min</span></span>
                        </div>
                    )}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-blue-900/30 flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Shift Avg UPH</span>
                        <span className="text-2xl font-bold">{shiftAvgFlowUPH}</span>
                    </div>
                    <div className="bg-[#15171B] border border-slate-800 text-slate-300 px-5 py-3 rounded-xl flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Total {metricLabel}</span>
                        <span className="text-xl font-bold font-mono text-white">{totalMetric.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-4">
                {/* Process Toggle */}
                <div className="flex items-center gap-1 bg-[#1A1D21] p-1 rounded-lg border border-slate-800">
                    {availableProcesses.map(key => (
                        <button
                            key={key}
                            onClick={() => setSelectedProcess(key)}
                            className={`px-5 py-2 text-xs font-bold rounded-md transition-all ${selectedProcess === key
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {PROCESS_LABELS[key]}
                        </button>
                    ))}
                </div>

                {/* Interval Selector */}
                <div className="flex items-center gap-1 bg-[#1A1D21] p-1 rounded-lg border border-slate-800">
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

                <div className="flex items-center gap-1 bg-[#1A1D21] p-1 rounded-lg border border-slate-800">
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

            {/* User Matrix Content */}
            <div className="bg-[#15171B] border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-4">
                <div className="overflow-auto max-h-[calc(100vh-340px)]">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-[#1A1D21] sticky top-0 z-10 text-slate-400 uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-3 border-b border-r border-slate-700 text-left min-w-[180px] sticky left-0 z-20 bg-[#1A1D21] hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('User')}>
                                    <div className="flex items-center gap-1 group">
                                        User
                                        {sortField === 'User' ? (sortDesc ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 border-b border-r border-slate-700 text-right min-w-[80px] bg-[#1A1D21] hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('Avg UPH')}>
                                    <div className="flex items-center justify-end gap-1 group">
                                        Avg UPH
                                        {sortField === 'Avg UPH' ? (sortDesc ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 border-b border-r border-slate-700 text-right min-w-[70px] bg-[#1A1D21] hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('Total')}>
                                    <div className="flex items-center justify-end gap-1 group">
                                        Total
                                        {sortField === 'Total' ? (sortDesc ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="p-3 border-b border-r border-slate-700 text-right min-w-[50px] bg-[#1A1D21] hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('Active')}>
                                    <div className="flex items-center justify-end gap-1 group">
                                        Active
                                        {sortField === 'Active' ? (sortDesc ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </th>
                                {sortedIntervals.map((interval, idx) => (
                                    <th key={idx} className="p-2 border-b border-slate-700 text-center min-w-[55px] whitespace-nowrap">
                                        <div className="flex flex-col items-center leading-tight">
                                            <span className="text-[10px]">{format(interval.intervalStart, 'HH:mm')}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {/* Summary Row */}
                            <tr className="bg-[#1A1D21]/80 font-bold">
                                <td className="p-3 border-r border-slate-700 text-slate-300 sticky left-0 z-10 bg-[#1A1D21]">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        <span>All Users</span>
                                    </div>
                                </td>
                                <td className="p-3 border-r border-slate-700 text-right font-mono text-indigo-400 font-bold">
                                    {shiftAvgFlowUPH}
                                </td>
                                <td className="p-3 border-r border-slate-700 text-right font-mono text-blue-400">
                                    {totalMetric.toLocaleString()}
                                </td>
                                <td className="p-3 border-r border-slate-700 text-right font-mono text-slate-400">
                                    {data.allUsers.length}
                                </td>
                                {sortedIntervals.map((interval, idx) => {
                                    const val = getCellVal(interval);
                                    return (
                                        <td key={idx} className="p-2 text-center font-mono text-blue-400">
                                            {val > 0 ? val : <span className="text-slate-700">·</span>}
                                        </td>
                                    );
                                })}
                            </tr>



                            {/* User Rows */}
                            {userTotals.map(({ user, total, activeIntervals, avgFlowUPH }) => (
                                <tr key={user} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 border-r border-slate-700 sticky left-0 z-10 bg-[#15171B]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold text-blue-400 shrink-0">
                                                {extractInitials(user)}
                                            </div>
                                            <span className="text-slate-300 font-medium truncate max-w-[120px]" title={user}>{user}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 border-r border-slate-700 text-right font-mono font-bold text-indigo-400">
                                        {avgFlowUPH > 0 ? avgFlowUPH : <span className="text-slate-700">0</span>}
                                    </td>
                                    <td className="p-3 border-r border-slate-700 text-right font-mono font-bold text-white">
                                        {total > 0 ? total.toLocaleString() : <span className="text-slate-700">0</span>}
                                    </td>
                                    <td className="p-3 border-r border-slate-700 text-right font-mono text-slate-500">
                                        {activeIntervals}
                                    </td>
                                    {sortedIntervals.map((interval, idx) => {
                                        const val = getCellVal(interval, user);
                                        const intensity = maxCellVol > 0 ? val / maxCellVol : 0;

                                        let cellBg = '';
                                        if (val > 0) {
                                            const alpha = Math.max(0.1, Math.min(0.8, intensity));
                                            cellBg = `rgba(52, 211, 153, ${alpha.toFixed(2)})`;
                                        }

                                        return (
                                            <td
                                                key={`${user}-${idx}`}
                                                className={`p-2 text-center font-mono text-[11px] transition-colors ${val > 0 ? 'text-white font-medium' : 'text-slate-700'}`}
                                                style={cellBg ? { backgroundColor: cellBg } : undefined}
                                            >
                                                {val > 0 ? val : '·'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
