import { useState, useMemo } from 'react';
import { type EnrichedShiftRecord } from '../types';
import { getHours, min, max } from 'date-fns';
import { cn } from '../lib/utils';
import { Layers, Package } from 'lucide-react';

interface ActivityMatrixProps {
    data: EnrichedShiftRecord[];
}

type AggregationMode = 'TASKS' | 'QTY';

export function ActivityMatrix({ data }: ActivityMatrixProps) {
    const [mode, setMode] = useState<AggregationMode>('TASKS');

    const { matrix, users, hours } = useMemo(() => {
        if (data.length === 0) return { matrix: {}, users: [], hours: [] };

        const usersSet = new Set<string>();
        const minTime = min(data.map(d => d.Finish)); // Use Finish time for bucketing
        const maxTime = max(data.map(d => d.Finish));

        // Create hours range
        const startHour = getHours(minTime);
        let endHour = getHours(maxTime);
        // Handle cross-midnight? For now assume single day shift or standard sort.
        if (endHour < startHour) endHour += 24;

        const hoursArr = [];
        for (let h = startHour; h <= endHour; h++) {
            hoursArr.push(h % 24);
        }

        const matrixData: Record<string, Record<number, { tasks: number; qty: number }>> = {};

        data.forEach(record => {
            usersSet.add(record.User);
            const h = getHours(record.Finish);

            if (!matrixData[record.User]) matrixData[record.User] = {};
            if (!matrixData[record.User][h]) matrixData[record.User][h] = { tasks: 0, qty: 0 };

            matrixData[record.User][h].tasks++;
            matrixData[record.User][h].qty += record.Quantity;
        });

        return {
            users: Array.from(usersSet).sort(),
            hours: hoursArr,
            matrix: matrixData
        };
    }, [data]);

    if (hours.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Activity Matrix</h3>

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

            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 font-medium text-slate-500 border-b border-slate-200 w-40 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                User
                            </th>
                            {hours.map(h => (
                                <th key={h} className="p-3 font-medium text-slate-500 border-b border-slate-200 min-w-[60px] text-center">
                                    {h}:00
                                </th>
                            ))}
                            <th className="p-3 font-medium text-slate-700 border-b border-slate-200 w-20 text-center bg-slate-50/80">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => {
                            let rowTotal = 0;
                            return (
                                <tr key={user} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-3 font-medium text-slate-700 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        {user}
                                    </td>
                                    {hours.map(h => {
                                        const cell = matrix[user][h];
                                        const val = cell ? (mode === 'TASKS' ? cell.tasks : cell.qty) : 0;
                                        rowTotal += val;
                                        return (
                                            <td key={h} className="p-2 text-center text-slate-600 border-r border-slate-50/50">
                                                {val > 0 ? (
                                                    <span className={cn(
                                                        "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium min-w-[30px]",
                                                        mode === 'TASKS' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                                                    )}>
                                                        {val}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-200">-</span>
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
