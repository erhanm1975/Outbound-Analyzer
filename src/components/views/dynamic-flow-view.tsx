import { format } from 'date-fns';
import { type FlowDetailData, type ShiftRecord, type IntervalData } from '../../types';
import { Activity, Users, Clock, Timer, BarChart3 } from 'lucide-react';
import { extractInitials } from '../../lib/utils';
import { useState, useMemo } from 'react';
import { TIME } from '../../config/constants';

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
type IntervalOption = 15 | 30 | 60;
type MetricMode = 'volume' | 'tasks';

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

interface ExtendedIntervalData extends IntervalData {
    taskCount: number;
    userTasks: Record<string, number>;
}

interface ExtendedFlowData {
    intervals: ExtendedIntervalData[];
    allUsers: string[];
}

function bucketRecords(records: ShiftRecord[], intervalMin: IntervalOption): ExtendedFlowData {
    if (records.length === 0) return { intervals: [], allUsers: [] };

    let minTime = Infinity;
    let maxTime = -Infinity;
    for (let i = 0; i < records.length; i++) {
        const s = records[i].Start.getTime();
        const f = records[i].Finish.getTime();
        if (s < minTime) minTime = s;
        if (f > maxTime) maxTime = f;
    }

    const bucketSizeMs = intervalMin * TIME.ONE_MINUTE_MS;
    const buckets: Record<number, {
        volume: number;
        taskCount: number;
        users: Set<string>;
        userVols: Record<string, number>;
        userTasks: Record<string, number>;
    }> = {};

    for (let t = minTime - (minTime % bucketSizeMs); t <= maxTime; t += bucketSizeMs) {
        buckets[t] = { volume: 0, taskCount: 0, users: new Set(), userVols: {}, userTasks: {} };
    }

    const distinctUsers = new Set<string>();

    records.forEach(r => {
        distinctUsers.add(r.User);
        const recordTime = r.Finish.getTime();
        const bucketStart = recordTime - (recordTime % bucketSizeMs);

        if (!buckets[bucketStart]) {
            buckets[bucketStart] = { volume: 0, taskCount: 0, users: new Set(), userVols: {}, userTasks: {} };
        }
        buckets[bucketStart].volume += r.Quantity;
        buckets[bucketStart].taskCount += 1;
        buckets[bucketStart].users.add(r.User);

        if (!buckets[bucketStart].userVols[r.User]) buckets[bucketStart].userVols[r.User] = 0;
        buckets[bucketStart].userVols[r.User] += r.Quantity;

        if (!buckets[bucketStart].userTasks[r.User]) buckets[bucketStart].userTasks[r.User] = 0;
        buckets[bucketStart].userTasks[r.User] += 1;
    });

    const multiplier = 60 / intervalMin;
    const sortedTimes = Object.keys(buckets).map(Number).sort((a, b) => a - b);

    const intervals: ExtendedIntervalData[] = sortedTimes.map(t => {
        const b = buckets[t];
        const activeUsers = b.users.size;
        let rate = 0;
        if (activeUsers > 0 && b.volume > 0) {
            rate = Math.round((b.volume / activeUsers) * multiplier);
        }
        return {
            intervalStart: new Date(t),
            intervalEnd: new Date(t + bucketSizeMs),
            volume: b.volume,
            taskCount: b.taskCount,
            activeUserCount: activeUsers,
            rate,
            users: b.userVols,
            userTasks: b.userTasks,
        };
    });

    return { intervals, allUsers: Array.from(distinctUsers).sort() };
}

export function DynamicFlowView({ rawRecords, processes }: DynamicFlowViewProps) {
    const [selectedProcess, setSelectedProcess] = useState<ProcessKey>('picking');
    const [intervalMin, setIntervalMin] = useState<IntervalOption>(30);
    const [metricMode, setMetricMode] = useState<MetricMode>('volume');

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

    // Calculate dynamic UPH (always based on volume)
    const dynamicUPH = useMemo(() => {
        const multiplier = 60 / intervalMin;
        let totalRate = 0;
        let validCount = 0;
        dynamicData.intervals.forEach(i => {
            if (i.volume > 0 && i.activeUserCount > 0) {
                totalRate += Math.round((i.volume / i.activeUserCount) * multiplier);
                validCount++;
            }
        });
        return validCount > 0 ? Math.round(totalRate / validCount) : 0;
    }, [dynamicData, intervalMin]);

    const { avgTaskDuration } = current;
    const processName = PROCESS_LABELS[selectedProcess];
    const data = dynamicData;
    const score = dynamicUPH;
    const isVolume = metricMode === 'volume';
    const metricLabel = isVolume ? 'Volume' : 'Tasks';

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

    // Per-user totals
    const userTotals = data.allUsers.map(user => {
        let total = 0;
        let activeIntervals = 0;
        sortedIntervals.forEach(interval => {
            const val = getCellVal(interval, user);
            total += val;
            if (val > 0) activeIntervals++;
        });
        return { user, total, activeIntervals };
    }).sort((a, b) => b.total - a.total);

    const totalMetric = sortedIntervals.reduce((acc, i) => acc + getCellVal(i), 0);

    return (
        <div className="space-y-6 p-6 bg-[#0F1115] min-h-full text-slate-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-500" />
                        {processName} Flow Audit
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {intervalMin}-minute intervals · {metricLabel} heatmap
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {avgTaskDuration !== undefined && (
                        <div className="bg-[#15171B] border border-slate-800 text-slate-300 px-5 py-3 rounded-xl flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Avg Task</span>
                            <span className="text-xl font-bold font-mono text-white">{avgTaskDuration} <span className="text-xs font-normal text-slate-500">min</span></span>
                        </div>
                    )}
                    {score !== undefined && (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-blue-900/30 flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Flow UPH</span>
                            <span className="text-2xl font-bold">{score}</span>
                        </div>
                    )}
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

                {/* Metric Toggle */}
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

            {/* Matrix Table */}
            <div className="bg-[#15171B] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-auto max-h-[calc(100vh-340px)]">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-[#1A1D21] sticky top-0 z-10 text-slate-400 uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-3 border-b border-r border-slate-700 text-left min-w-[180px] sticky left-0 z-20 bg-[#1A1D21]">
                                    User
                                </th>
                                <th className="p-3 border-b border-r border-slate-700 text-right min-w-[70px] bg-[#1A1D21]">
                                    Total
                                </th>
                                <th className="p-3 border-b border-r border-slate-700 text-right min-w-[50px] bg-[#1A1D21]">
                                    Active
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

                            {/* UPH Row */}
                            <tr className="bg-[#12141a] border-b-2 border-slate-700">
                                <td className="p-3 border-r border-slate-700 text-slate-500 italic sticky left-0 z-10 bg-[#12141a]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wider">UPH (Annualized)</span>
                                    </div>
                                </td>
                                <td className="p-3 border-r border-slate-700 text-right font-mono text-indigo-400 font-bold">
                                    {score || '-'}
                                </td>
                                <td className="p-3 border-r border-slate-700"></td>
                                {sortedIntervals.map((interval, idx) => (
                                    <td key={idx} className="p-2 text-center font-mono text-indigo-400 text-[10px]">
                                        {interval.rate > 0 ? interval.rate : <span className="text-slate-700">·</span>}
                                    </td>
                                ))}
                            </tr>

                            {/* User Rows */}
                            {userTotals.map(({ user, total, activeIntervals }) => (
                                <tr key={user} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 border-r border-slate-700 sticky left-0 z-10 bg-[#15171B]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold text-blue-400 shrink-0">
                                                {extractInitials(user)}
                                            </div>
                                            <span className="text-slate-300 font-medium truncate max-w-[120px]" title={user}>{user}</span>
                                        </div>
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
