import { useState, useMemo } from 'react';
import { type EnrichedShiftRecord } from '../types';
import { getHours, min, max } from 'date-fns';
import { cn } from '../lib/utils';
import { Layers, Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RichTooltip } from './rich-tooltip';
import { METRIC_TOOLTIPS, TooltipContainer } from '../logic/metric-definitions';

// ... (existing imports)



interface ActivityMatrixProps {
    data: EnrichedShiftRecord[];
    benchmarkData?: EnrichedShiftRecord[] | null;
}

type AggregationMode = 'TASKS' | 'QTY';

export function ActivityMatrix({ data, benchmarkData }: ActivityMatrixProps) {
    const [mode, setMode] = useState<AggregationMode>('TASKS');

    const { matrix, bmkMatrix, hourlyTotals, bmkHourlyTotals, users, hours } = useMemo(() => {
        if (data.length === 0) return { matrix: {}, bmkMatrix: {}, hourlyTotals: {}, bmkHourlyTotals: {}, users: [], hours: [] };

        const usersSet = new Set<string>();
        const minTime = min(data.map(d => d.Finish)); // Use Finish time for bucketing
        const maxTime = max(data.map(d => d.Finish));

        // Create hours range
        const startHour = getHours(minTime);
        let endHour = getHours(maxTime);

        // Simple midnight handling: if end < start, assume next day overlap +24
        if (endHour < startHour) endHour += 24;

        const hoursArr = [];
        for (let h = startHour; h <= endHour; h++) {
            hoursArr.push(h % 24);
        }

        // Helper to normalize user keys for matching
        const normalize = (u: string) => u.trim().toLowerCase();

        // Helper to process dataset into matrix
        const processDataset = (dataset: EnrichedShiftRecord[] | undefined, popUsers: boolean) => {
            const mat: Record<string, Record<number, { tasks: number; qty: number }>> = {};
            if (!dataset) return mat;

            dataset.forEach(record => {
                // Populate display users list from PRIMARY dataset only
                if (popUsers) usersSet.add(record.User);

                const key = normalize(record.User);
                const h = getHours(record.Finish);

                if (!mat[key]) mat[key] = {};
                if (!mat[key][h]) mat[key][h] = { tasks: 0, qty: 0 };

                mat[key][h].tasks++;
                mat[key][h].qty += record.Quantity;
            });
            return mat;
        };

        const matrixData = processDataset(data, true);
        const benchmarkMatrixData = processDataset(benchmarkData || undefined, false);

        // Calculate Totals
        const calculateHourlyTotals = (mat: Record<string, Record<number, { tasks: number; qty: number }>>) => {
            const totals: Record<number, { tasks: number; qty: number }> = {};
            Object.values(mat).forEach(userHours => {
                Object.entries(userHours).forEach(([hStr, stats]) => {
                    const h = parseInt(hStr);
                    if (!totals[h]) totals[h] = { tasks: 0, qty: 0 };
                    totals[h].tasks += stats.tasks;
                    totals[h].qty += stats.qty;
                });
            });
            return totals;
        };

        const hourlyTotalsData = calculateHourlyTotals(matrixData);
        const bmkHourlyTotalsData = calculateHourlyTotals(benchmarkMatrixData);

        return {
            users: Array.from(usersSet).sort(),
            hours: hoursArr,
            matrix: matrixData,
            bmkMatrix: benchmarkMatrixData,
            hourlyTotals: hourlyTotalsData,
            bmkHourlyTotals: bmkHourlyTotalsData
        };
    }, [data, benchmarkData]);

    if (hours.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    Activity Matrix
                    {benchmarkData && (
                        <span className="text-xs font-normal text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">
                            Vs Benchmark
                        </span>
                    )}
                </h3>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setMode('TASKS')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all",
                            mode === 'TASKS' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Tasks
                    </button>
                    <button
                        onClick={() => setMode('QTY')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all",
                            mode === 'QTY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Package className="w-3.5 h-3.5" />
                        Volume
                    </button>
                </div>
            </div>

            {/* Removed misplaced imports */}


            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 font-medium text-slate-500 border-b border-slate-200 w-40 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex items-center gap-1.5">
                                    User
                                    <RichTooltip content={METRIC_TOOLTIPS.COL_MATRIX_USER} />
                                </div>
                            </th>
                            {hours.map(h => (
                                <th key={h} className="p-3 font-medium text-slate-500 border-b border-slate-200 min-w-[80px] text-center group/th">
                                    <div className="flex items-center justify-center gap-1">
                                        {h}:00
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_MATRIX_HOUR} className="opacity-0 group-hover/th:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                            ))}
                            <th className="p-3 font-medium text-slate-700 border-b border-slate-200 w-20 text-center bg-slate-50/80">
                                <div className="flex items-center justify-center gap-1.5">
                                    Total
                                    <RichTooltip content={METRIC_TOOLTIPS.COL_MATRIX_TOTAL} />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* TOTAL ROW */}
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                            <td className="p-3 font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                TOTAL
                            </td>
                            {hours.map(h => {
                                const val = hourlyTotals[h] ? (mode === 'TASKS' ? hourlyTotals[h].tasks : hourlyTotals[h].qty) : 0;

                                // Benchmark Logic for Totals
                                const bmkVal = bmkHourlyTotals[h] ? (mode === 'TASKS' ? bmkHourlyTotals[h].tasks : bmkHourlyTotals[h].qty) : 0;
                                const hasBmk = !!benchmarkData && (val > 0 || bmkVal > 0);
                                const diff = val - bmkVal;
                                const isPositive = diff > 0;

                                const tooltipContent = hasBmk ? (
                                    <TooltipContainer title="Hourly Total Performance">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            <span className="text-slate-400">Active:</span>
                                            <span className="font-mono text-right text-emerald-400">{val}</span>
                                            <span className="text-slate-400">Benchmark:</span>
                                            <span className="font-mono text-right text-indigo-300">{bmkVal}</span>
                                            <div className="col-span-2 border-t border-white/10 my-1"></div>
                                            <span className="text-slate-400">Difference:</span>
                                            <span className={`font-mono text-right font-bold ${isPositive ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </span>
                                        </div>
                                    </TooltipContainer>
                                ) : null;

                                return (
                                    <td key={h} className="p-2 text-center text-slate-800 font-bold border-r border-slate-200 relative group/cell">
                                        {hasBmk && (val > 0 || bmkVal > 0) ? (
                                            <RichTooltip content={tooltipContent}>
                                                <div className="cursor-help w-full h-full flex items-center justify-center">
                                                    {val > 0 ? (
                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                            <span>{val}</span>
                                                            {/* Benchmark Indicator */}
                                                            {bmkVal > 0 && Math.abs(diff) > 0 && (
                                                                <div className={cn(
                                                                    "flex items-center text-[9px] font-bold",
                                                                    isPositive ? "text-emerald-600" : "text-rose-600"
                                                                )}>
                                                                    {isPositive ? <TrendingUp className="w-2 h-2 mr-0.5" /> : <TrendingDown className="w-2 h-2 mr-0.5" />}
                                                                    {Math.abs(diff)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </div>
                                            </RichTooltip>
                                        ) : (
                                            val > 0 ? <span>{val}</span> : <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="p-3 font-bold text-slate-900 text-center bg-slate-100">
                                {Object.values(hourlyTotals).reduce((sum, h) => sum + (mode === 'TASKS' ? h.tasks : h.qty), 0)}
                            </td>
                        </tr>

                        {users.map(user => {
                            let rowTotal = 0;
                            return (
                                <tr key={user} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-3 font-medium text-slate-700 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        {user}
                                    </td>
                                    {hours.map(h => {
                                        const key = user.trim().toLowerCase();
                                        const cell = matrix[key]?.[h];
                                        const val = cell ? (mode === 'TASKS' ? cell.tasks : cell.qty) : 0;

                                        // Benchmark Logic
                                        const bmkCell = bmkMatrix[key]?.[h];
                                        const bmkVal = bmkCell ? (mode === 'TASKS' ? bmkCell.tasks : bmkCell.qty) : 0;

                                        const hasBmk = !!benchmarkData && !!bmkCell;
                                        const diff = val - bmkVal;
                                        const isPositive = diff > 0;

                                        rowTotal += val;

                                        const tooltipContent = hasBmk ? (
                                            <TooltipContainer title={`Performance: ${user}`}>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                    <span className="text-slate-400">Active:</span>
                                                    <span className="font-mono text-right text-emerald-400">{val}</span>
                                                    <span className="text-slate-400">Benchmark:</span>
                                                    <span className="font-mono text-right text-indigo-300">{bmkVal}</span>
                                                    <div className="col-span-2 border-t border-white/10 my-1"></div>
                                                    <span className="text-slate-400">Difference:</span>
                                                    <span className={`font-mono text-right font-bold ${isPositive ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                        {diff > 0 ? '+' : ''}{diff}
                                                    </span>
                                                </div>
                                            </TooltipContainer>
                                        ) : null;

                                        return (
                                            <td key={h} className="p-2 text-center text-slate-600 border-r border-slate-50/50 relative group/cell">
                                                {hasBmk && (val > 0 || bmkVal > 0) ? (
                                                    <RichTooltip content={tooltipContent}>
                                                        <div className="cursor-help w-full h-full flex items-center justify-center">
                                                            {val > 0 ? (
                                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                                    <span className={cn(
                                                                        "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium min-w-[30px]",
                                                                        mode === 'TASKS' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                                                                    )}>
                                                                        {val}
                                                                    </span>

                                                                    {/* Benchmark Indicator */}
                                                                    {bmkVal > 0 && Math.abs(diff) > 0 && (
                                                                        <div className={cn(
                                                                            "flex items-center text-[9px] font-bold",
                                                                            isPositive ? "text-emerald-500" : "text-rose-500"
                                                                        )}>
                                                                            {isPositive ? <TrendingUp className="w-2 h-2 mr-0.5" /> : <TrendingDown className="w-2 h-2 mr-0.5" />}
                                                                            {Math.abs(diff)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-200">-</span>
                                                            )}
                                                        </div>
                                                    </RichTooltip>
                                                ) : (
                                                    val > 0 ? (
                                                        <span className={cn(
                                                            "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium min-w-[30px]",
                                                            mode === 'TASKS' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                                                        )}>
                                                            {val}
                                                        </span>
                                                    ) : <span className="text-slate-200">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 font-bold text-slate-900 text-center bg-slate-50/30">
                                        {rowTotal}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
