import { format } from 'date-fns';
import { type FlowDetailData } from '../types';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { extractInitials } from '../lib/utils';
import { useState } from 'react';

interface DynamicFlowViewProps {
    data: FlowDetailData;
    processName: string;
    score?: number;
    avgTaskDuration?: number; // NEW
}

export function DynamicFlowView({ data, processName, score, avgTaskDuration }: DynamicFlowViewProps) {
    // Basic sorting functionality
    const [isAsc, setIsAsc] = useState(true);

    const sortedIntervals = [...data.intervals].sort((a, b) => {
        return isAsc
            ? a.intervalStart.getTime() - b.intervalStart.getTime()
            : b.intervalStart.getTime() - a.intervalStart.getTime();
    });

    const toggleSort = () => setIsAsc(!isAsc);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        {processName} Dynamic Flow Audit
                    </h2>
                    <p className="text-sm text-slate-500">
                        10-minute intervals showing volume per user and active headcount efficiency.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {avgTaskDuration !== undefined && (
                        <div className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl shadow-sm flex flex-col items-center min-w-[120px]">
                            <span className="text-xs font-medium opacity-70 uppercase tracking-wide">Avg Task Duration</span>
                            <span className="text-2xl font-bold font-mono">{avgTaskDuration} <span className="text-sm font-normal text-slate-400">min</span></span>
                        </div>
                    )}
                    {score !== undefined && (
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-5 py-3 rounded-xl shadow-lg flex flex-col items-center min-w-[120px]">
                            <span className="text-xs font-medium opacity-90 uppercase tracking-wide">Dynamic Flow UPH</span>
                            <span className="text-3xl font-bold">{score}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 font-medium text-slate-500">
                            <tr>
                                <th
                                    className="p-3 border-b border-r border-slate-200 text-left min-w-[140px] cursor-pointer hover:bg-slate-100 transition-colors sticky left-0 z-20 bg-slate-50"
                                    onClick={toggleSort}
                                >
                                    <div className="flex items-center gap-1">
                                        Interval ({isAsc ? 'Old→New' : 'New→Old'})
                                        {isAsc ? <ArrowDown className="w-3" /> : <ArrowUp className="w-3" />}
                                    </div>
                                </th>
                                <th className="p-3 border-b border-slate-200 text-right min-w-[80px] font-bold text-slate-700 bg-slate-50 z-10">
                                    Score (Hr)
                                </th>
                                <th className="p-3 border-b border-slate-200 text-right min-w-[80px] bg-slate-50 z-10">
                                    Total Vol
                                </th>
                                <th className="p-3 border-b border-r border-slate-200 text-right min-w-[60px] bg-slate-50 z-10">
                                    Active
                                </th>

                                {/* User Columns */}
                                {data.allUsers.map(user => (
                                    <th key={user} className="p-2 border-b border-slate-200 text-center min-w-[60px] whitespace-nowrap" title={user}>
                                        <div className="flex flex-col items-center">
                                            <span>{extractInitials(user)}</span>
                                            <span className="text-[9px] text-slate-300 font-normal truncate max-w-[50px]">{user.split(' ')[0]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedIntervals.map((interval, idx) => {
                                // Highlight empty or low volume rows
                                const isIdle = interval.volume === 0;

                                return (
                                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isIdle ? 'bg-slate-50/50 grayscale opacity-60' : ''}`}>
                                        <td className="p-3 border-r border-slate-100 font-mono text-slate-600 sticky left-0 bg-white group-hover:bg-slate-50">
                                            {format(interval.intervalStart, 'HH:mm')} - {format(interval.intervalEnd, 'HH:mm')}
                                        </td>
                                        <td className="p-3 text-right font-bold text-indigo-600 border-r border-slate-100 bg-indigo-50/10">
                                            {interval.rate > 0 ? interval.rate : '-'}
                                        </td>
                                        <td className="p-3 text-right font-medium text-slate-700">
                                            {interval.volume > 0 ? interval.volume : '-'}
                                        </td>
                                        <td className="p-3 text-right border-r border-slate-100 font-mono text-slate-500">
                                            {interval.activeUserCount > 0 ? interval.activeUserCount : '-'}
                                        </td>

                                        {/* User Cells */}
                                        {data.allUsers.map(user => {
                                            const val = interval.users[user];
                                            const isActive = val > 0;
                                            return (
                                                <td key={`${idx}-${user}`} className={`p-2 text-center border-r border-slate-50 last:border-0 ${isActive ? 'text-slate-700 font-medium' : 'text-slate-200'}`}>
                                                    {isActive ? val : '.'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
