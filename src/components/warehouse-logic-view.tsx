import { useState, useMemo } from 'react';
import type { TaskObject, ActivityObject, BufferConfig } from '../types';
import { format } from 'date-fns';
import { Search, Filter, Download, Table, Activity, ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

interface WarehouseLogicViewProps {
    tasks: TaskObject[];
    activities: ActivityObject[];
    config: BufferConfig;
}

export function WarehouseLogicView({ tasks, activities, config }: WarehouseLogicViewProps) {
    const [viewMode, setViewMode] = useState<'tasks' | 'activities'>('tasks');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');

    // Filtering Logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch =
                searchTerm === '' ||
                t.JobCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.User.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.SKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.TaskType.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === 'ALL' || t.TaskType === filterType;

            return matchesSearch && matchesType;
        });
    }, [tasks, searchTerm, filterType]);

    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            const matchesSearch =
                searchTerm === '' ||
                (a.JobCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.User.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [activities, searchTerm]);

    // Export Logic
    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Task Sheet
        const taskWs = XLSX.utils.json_to_sheet(filteredTasks.map(t => ({
            ...t,
            Start: t.Start.toISOString(),
            Finish: t.Finish.toISOString()
        })));
        XLSX.utils.book_append_sheet(wb, taskWs, "Tasks");

        // Activity Sheet
        const actWs = XLSX.utils.json_to_sheet(filteredActivities.map(a => ({
            ...a,
            Start: a.Start.toISOString(),
            Finish: a.Finish.toISOString()
        })));
        XLSX.utils.book_append_sheet(wb, actWs, "Activities");

        XLSX.writeFile(wb, `Forensic_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // Helper: Duration Formatter
    const fmt = (n: number) => n.toFixed(0);

    return (
        <div className="p-6 bg-[#0F1115] min-h-full text-slate-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Table className="w-6 h-6 text-blue-500" />
                        Forensic Data Grid
                    </h2>
                    <p className="text-sm text-slate-500">Atomic Level Task & Activity Inspection</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-[#1A1D21] p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setViewMode('tasks')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'tasks' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Task Objects
                        </button>
                        <button
                            onClick={() => setViewMode('activities')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'activities' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Activity Objects
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder={viewMode === 'tasks' ? "Search Task, SKU, Job, User..." : "Search Activity, Job, User..."}
                        className="w-full bg-[#15171B] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {viewMode === 'tasks' && (
                    <div className="relative">
                        <select
                            className="appearance-none bg-[#15171B] border border-slate-800 rounded-lg pl-4 pr-10 py-2 text-sm font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Task Types</option>
                            <option value="Pick">Pick</option>
                            <option value="Pack">Pack</option>
                            <option value="Sort">Sort</option>
                            <option value="Break">Break</option>
                            <option value="No Activity">No Activity</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Content Grid */}
            <div className="bg-[#15171B] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    {viewMode === 'tasks' ? (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#1A1D21] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Job Code</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3">Zone</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Start</th>
                                    <th className="px-4 py-3 text-right">Finish</th>
                                    <th className="px-4 py-3 text-right text-emerald-500">Prod (s)</th>
                                    <th className="px-4 py-3 text-right text-blue-400">Direct (s)</th>
                                    <th className="px-4 py-3 text-right text-amber-500">Travel (s)</th>
                                    <th className="px-4 py-3 text-right text-rose-500">Unprod (s)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredTasks.slice(0, 500).map((t, i) => {
                                    const isUnprod = t.TaskType === 'Break' || t.TaskType === 'No Activity' || t.TaskType === 'Delay';
                                    return (
                                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-2 font-medium text-slate-300">{t.User}</td>
                                            <td className="px-4 py-2 text-slate-400">{t.Client || '-'}</td>
                                            <td className="px-4 py-2 font-mono text-slate-400">{t.JobCode}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${t.TaskType === 'Break' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                    t.TaskType === 'No Activity' ? 'bg-slate-700/30 text-slate-400 border-slate-600' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {t.TaskType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-slate-400">{t.SKU || '-'}</td>
                                            <td className="px-4 py-2 font-mono text-slate-500">{t.Location || '-'}</td>
                                            <td className="px-4 py-2 text-slate-500">{t.Zone || '-'}</td>
                                            <td className="px-4 py-2 text-right font-mono">{t.Quantity}</td>
                                            <td className="px-4 py-2 text-right font-mono text-slate-500">{format(t.Start, 'HH:mm:ss')}</td>
                                            <td className="px-4 py-2 text-right font-mono text-slate-500">{format(t.Finish, 'HH:mm:ss')}</td>

                                            <td className={`px-4 py-2 text-right font-mono font-bold ${t.ProductiveDurationSec > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>
                                                {fmt(t.ProductiveDurationSec)}
                                            </td>
                                            <td className={`px-4 py-2 text-right font-mono ${t.TaskDirectTimeSec > 0 ? 'text-blue-300' : 'text-slate-700'}`}>
                                                {fmt(t.TaskDirectTimeSec)}
                                            </td>
                                            <td className={`px-4 py-2 text-right font-mono ${t.TaskTravelTimeSec > 0 ? 'text-amber-300' : 'text-slate-700'}`}>
                                                {fmt(t.TaskTravelTimeSec)}
                                            </td>
                                            <td className={`px-4 py-2 text-right font-mono font-bold ${t.UnproductiveDurationSec > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                                                {fmt(t.UnproductiveDurationSec)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#1A1D21] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Job Code</th>
                                    <th className="px-4 py-3">Activity</th>
                                    <th className="px-4 py-3 text-right">Start</th>
                                    <th className="px-4 py-3 text-right">Finish</th>
                                    <th className="px-4 py-3 text-right">Tasks</th>
                                    <th className="px-4 py-3 text-right">Orders</th>
                                    <th className="px-4 py-3 text-right">Units</th>
                                    <th className="px-4 py-3 text-right text-emerald-500">Prod (s)</th>
                                    <th className="px-4 py-3 text-right text-rose-500">Unprod (s)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredActivities.map((a, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-2 font-medium text-slate-300">{a.User}</td>
                                        <td className="px-4 py-2 font-mono text-slate-400">{a.JobCode || 'Unassigned'}</td>
                                        <td className="px-4 py-2 text-blue-300">{a.Activity}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-500">{format(a.Start, 'HH:mm:ss')}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-500">{format(a.Finish, 'HH:mm:ss')}</td>
                                        <td className="px-4 py-2 text-right font-mono">{a.NofTasks}</td>
                                        <td className="px-4 py-2 text-right font-mono">{a.NofOrders}</td>
                                        <td className="px-4 py-2 text-right font-mono">{a.NofUnits}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-400">{fmt(a.ProductiveDurationSec)}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-rose-500">{fmt(a.UnproductiveDurationSec)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-2 border-t border-slate-800 text-xs text-slate-500 text-center">
                    Showing {viewMode === 'tasks' ? filteredTasks.length : filteredActivities.length} records (Limited to 500 for performance)
                </div>
            </div>
        </div>
    );
}
