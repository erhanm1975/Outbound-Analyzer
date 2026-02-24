import { useState, useMemo } from 'react';
import { type UserPerformanceStats } from '../types';
import { extractInitials } from '../lib/utils';
import { Trophy, TrendingUp, TrendingDown, Clock, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { RichTooltip } from './rich-tooltip';
import { METRIC_TOOLTIPS } from '../logic/metric-definitions';

interface UserPerformanceViewProps {
    data: UserPerformanceStats[];
}

export function UserPerformanceView({ data }: UserPerformanceViewProps) {
    const [sortField, setSortField] = useState<keyof UserPerformanceStats>('uph');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (field: keyof UserPerformanceStats) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc'); // Default to desc for metrics
        }
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let valA = a[sortField as keyof UserPerformanceStats] ?? 0;
            let valB = b[sortField as keyof UserPerformanceStats] ?? 0;

            // Handle numeric sort strictly
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }
            // Fallback for strings
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortField, sortDir]);

    // Top 3 Calculation (based on UPH regardless of current sort)
    const topPerformers = useMemo(() => {
        return [...data].sort((a, b) => b.uph - a.uph).slice(0, 3);
    }, [data]);

    const lowPerformers = useMemo(() => {
        return [...data].sort((a, b) => a.uph - b.uph).slice(0, 3); // Lowest first
    }, [data]);


    if (data.length === 0) return (
        <div className="flex items-center justify-center h-64 text-slate-400 bg-[#0d1117] rounded-xl border border-dashed border-slate-800">
            No user performance data available
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Highlights Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 3 */}
                <div className="bg-gradient-to-br from-indigo-950/40 to-[#111418] border border-indigo-900/40 rounded-xl p-5 shadow-none">
                    <h3 className="text-sm font-semibold text-indigo-300 mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Top Performers (UPH)
                    </h3>
                    <div className="space-y-3">
                        {topPerformers.map((user, idx) => (
                            <div key={user.user} className="flex items-center justify-between p-2 bg-[#111418] rounded-lg border border-indigo-900/30 shadow-none relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400"></div>
                                <div className="flex items-center gap-3 pl-2">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-none
                                        ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : 'bg-amber-700'}
                                    `}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-100">{user.user}</div>
                                        <div className="text-[10px] text-slate-400">{user.totalVolume} units / {user.totalShiftSpan} hrs</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-indigo-400 leading-none">{user.uph}</div>
                                    <div className="text-[10px] font-medium text-indigo-400">UPH</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lowest 3 */}
                <div className="bg-[#111418] border border-slate-800 rounded-xl p-5 shadow-none">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                        Needs Attention
                    </h3>
                    <div className="space-y-3">
                        {lowPerformers.map((user, idx) => (
                            <div key={user.user} className="flex items-center justify-between p-2 bg-[#111418] rounded-lg border border-slate-800 shadow-none">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium">
                                        {extractInitials(user.user)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-300">{user.user}</div>
                                        <div className="text-[10px] text-slate-400">{user.totalVolume} units / {user.totalShiftSpan} hrs</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-rose-400 leading-none">{user.uph}</div>
                                    <div className="text-[10px] font-medium text-rose-400">UPH</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-[#111418] rounded-xl border border-slate-800 shadow-none flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-[#0d1117]">
                    <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        All User Metrics
                        <span className="text-slate-400 text-xs font-normal">({data.length} users)</span>
                    </h3>
                    <div className="text-xs text-slate-400 italic">
                        UPH (Occupancy) = Total Units / Shift Span (First to Last Scan)
                    </div>
                </div>

                {/* Removed misplaced imports */}

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#111418] text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="p-3 w-16 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        Rank
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_RANK} />
                                    </div>
                                </th>
                                <th className="p-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('user')}>
                                    <div className="flex items-center gap-1">
                                        User {sortField === 'user' && (sortDir === 'asc' ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" />)}
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_USER} />
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('uph')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_UPH_OCC} />
                                        UPH (Occ) {sortField === 'uph' && (sortDir === 'asc' ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" />)}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('totalVolume')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_VOLUME} />
                                        Volume {sortField === 'totalVolume' && (sortDir === 'asc' ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" />)}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('totalShiftSpan')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_SPAN} />
                                        Span (Hrs) {sortField === 'totalShiftSpan' && (sortDir === 'asc' ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" />)}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('directTime')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_DIRECT_TIME} />
                                        Active (Hrs) {sortField === 'directTime' && (sortDir === 'asc' ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" />)}
                                    </div>
                                </th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('utilization')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <RichTooltip content={METRIC_TOOLTIPS.COL_UTIL_PERCENT} />
                                        Util % {sortField === 'utilization' && (sortDir === 'asc' ? <ArrowUp className="w-3" /> : <ArrowDown className="w-3" />)}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {sortedData.map((user) => (
                                <tr key={user.user} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-3 text-center text-slate-400 font-medium">#{user.rank}</td>
                                    <td className="p-3 font-medium text-slate-300">{user.user}</td>
                                    <td className="p-3 text-right font-bold text-slate-100">{user.uph}</td>
                                    <td className="p-3 text-right text-slate-400">{(user.totalVolume ?? 0).toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-400">{user.totalShiftSpan}</td>
                                    <td className="p-3 text-right text-slate-400">{user.directTime}</td>
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
        </div>
    );
}
