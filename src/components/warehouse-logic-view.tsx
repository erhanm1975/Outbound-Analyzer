import { useState, useMemo } from 'react';
import type { TaskObject, ActivityObject } from '../types';
import { Layers, List, Filter, Search } from 'lucide-react';
import { RichTooltip } from './rich-tooltip';

interface WarehouseLogicViewProps {
    taskObjects: TaskObject[];
    activityObjects: ActivityObject[];
}

export function WarehouseLogicView({ taskObjects, activityObjects }: WarehouseLogicViewProps) {
    const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'TASKS'>('ACTIVITY');

    // Filters
    const [searchUser, setSearchUser] = useState('');
    const [searchJob, setSearchJob] = useState('');

    // Filter Logic
    const filteredTasks = useMemo(() => {
        return taskObjects.filter(t => {
            const matchUser = t.User.toLowerCase().includes(searchUser.toLowerCase());
            const matchJob = t.JobCode.toLowerCase().includes(searchJob.toLowerCase());
            return matchUser && matchJob;
        });
    }, [taskObjects, searchUser, searchJob]);

    const filteredActivities = useMemo(() => {
        return activityObjects.filter(a => {
            const matchUser = a.User.toLowerCase().includes(searchUser.toLowerCase());
            const matchJob = (a.JobCode || '').toLowerCase().includes(searchJob.toLowerCase());
            return matchUser && matchJob;
        });
    }, [activityObjects, searchUser, searchJob]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-6 h-6 text-indigo-600" />
                        Forensic Audit
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Detailed analysis of Task bricks and Activity sequences.</p>
                </div>

                <div className="flex gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    <button
                        onClick={() => setActiveTab('ACTIVITY')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ACTIVITY' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Layers className="w-4 h-4" />
                        Activity Objects
                    </button>
                    <button
                        onClick={() => setActiveTab('TASKS')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'TASKS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List className="w-4 h-4" />
                        Task Objects
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter by User..."
                        value={searchUser}
                        onChange={e => setSearchUser(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter by Job Code..."
                        value={searchJob}
                        onChange={e => setSearchJob(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                    />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Showing: <b>{activeTab === 'ACTIVITY' ? filteredActivities.length : filteredTasks.length}</b> records</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    {activeTab === 'ACTIVITY' ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Activity</th>
                                    <th className="px-4 py-3">Job Code</th>
                                    <th className="px-4 py-3">Start</th>
                                    <th className="px-4 py-3">Finish</th>
                                    <th className="px-4 py-3 text-right">Prod Dur (s)</th>
                                    <th className="px-4 py-3 text-right">Task Direct (s)</th>
                                    <th className="px-4 py-3 text-right">Task Travel (s)</th>
                                    <th className="px-4 py-3 text-right">Unprod Dur (s)</th>
                                    <th className="px-4 py-3 text-right">Orders</th>
                                    <th className="px-4 py-3 text-right">Tasks</th>
                                    <th className="px-4 py-3 text-right">Units</th>
                                    <th className="px-4 py-3 text-right">Avg Task (s)</th>
                                    <th className="px-4 py-3 text-right">Avg Travel (s)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredActivities.slice(0, 100).map((act) => (
                                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2 font-medium text-slate-700">{act.User}</td>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${act.Activity === 'Break' ? 'bg-rose-100 text-rose-700' :
                                                act.Activity === 'No Activity' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {act.Activity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{act.JobCode || '-'}</td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">{act.Start.toLocaleTimeString()}</td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">{act.Finish.toLocaleTimeString()}</td>
                                        <td className="px-4 py-2 text-right font-mono text-emerald-600">{act.ProductiveDurationSec.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-600">{act.TaskDirectTimeSec.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-slate-600">{act.TaskTravelTimeSec.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-rose-600">{act.UnproductiveDurationSec > 0 ? act.UnproductiveDurationSec.toFixed(1) : '-'}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{act.NofOrders}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{act.NofTasks}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{act.NofUnits}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{act.AvgTaskDurationSec.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{act.AvgTravelDurationSec.toFixed(1)}</td>
                                    </tr>
                                ))}
                                {filteredActivities.length > 100 && (
                                    <tr>
                                        <td colSpan={14} className="text-center py-4 text-slate-400 text-xs italic">
                                            Showing first 100 records only for performance...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3">Zone</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3">Job Code</th>
                                    <th className="px-4 py-3">Task Type</th>
                                    <th className="px-4 py-3">Start</th>
                                    <th className="px-4 py-3">Finish</th>
                                    <th className="px-4 py-3 text-right">Prod Dur (s)</th>
                                    <th className="px-4 py-3 text-right">Direct (s)</th>
                                    <th className="px-4 py-3 text-right">Travel (s)</th>
                                    <th className="px-4 py-3 text-right">Unprod (s)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTasks.slice(0, 100).map((task, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2 font-medium text-slate-700">{task.User}</td>
                                        <td className="px-4 py-2 text-xs text-slate-500">{task.Client}</td>
                                        <td className="px-4 py-2 text-xs font-mono text-slate-600">{task.SKU}</td>
                                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{task.Location}</td>
                                        <td className="px-4 py-2 text-xs text-slate-500">{task.Zone}</td>
                                        <td className="px-4 py-2 text-right text-xs text-slate-700">{task.Quantity}</td>
                                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{task.JobCode}</td>
                                        <td className="px-4 py-2 text-xs text-slate-600">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${task.TaskType.toLowerCase().includes('break') || task.TaskType.toLowerCase().includes('delay')
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {task.TaskType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">{task.Start.toLocaleTimeString()}</td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">{task.Finish.toLocaleTimeString()}</td>
                                        <td className="px-4 py-2 text-right font-mono text-emerald-600">{task.ProductiveDurationSec > 0 ? task.ProductiveDurationSec.toFixed(1) : '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-sky-600">{task.TaskDirectTimeSec > 0 ? task.TaskDirectTimeSec.toFixed(1) : '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-amber-600">{task.TaskTravelTimeSec > 0 ? task.TaskTravelTimeSec.toFixed(1) : '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-rose-600">{task.UnproductiveDurationSec > 0 ? task.UnproductiveDurationSec.toFixed(1) : '-'}</td>
                                    </tr>
                                ))}
                                {filteredTasks.length > 100 && (
                                    <tr>
                                        <td colSpan={14} className="text-center py-4 text-slate-400 text-xs italic">
                                            Showing first 100 records only for performance...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
