import { Cpu, User } from 'lucide-react';
import { type AIVsManualStats } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DataHealthAIBreakdownProps {
    stats: AIVsManualStats;
}

export function DataHealthAIBreakdown({ stats }: DataHealthAIBreakdownProps) {
    const totalJobs = stats.aiJobs + stats.manualJobs;

    return (
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-500" />
                        AI vs Manual Data Breakdown
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Efficiency relies on structured data. Manual jobs without AI descriptions often lead to systemic inefficiencies.
                    </p>
                </div>
                {totalJobs > 0 && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-400">
                            {totalJobs > 0 ? ((stats.aiJobs / totalJobs) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="text-xs text-slate-400">AI Coverage</div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                {/* Pie Chart */}
                <div className="col-span-1 md:border-r border-slate-200 dark:border-slate-800 flex justify-center h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'AI Jobs', value: stats.aiJobs },
                                    { name: 'Manual Jobs', value: stats.manualJobs }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell fill="#6366f1" /> {/* AI: Indigo */}
                                <Cell fill="#f43f5e" /> {/* Manual: Rose */}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* KPI Metrics */}
                <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Jobs */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Distinct Jobs</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                                    <Cpu className="w-4 h-4" /> AI Generated
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.aiJobs.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-400 font-medium">
                                    <User className="w-4 h-4" /> Manual
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.manualJobs.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Orders */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Orders Processed</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                                    <Cpu className="w-4 h-4" /> AI Generated
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.aiOrders.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-400 font-medium">
                                    <User className="w-4 h-4" /> Manual
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.manualOrders.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Units */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Units Processed</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                                    <Cpu className="w-4 h-4" /> AI Generated
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.aiUnits.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-400 font-medium">
                                    <User className="w-4 h-4" /> Manual
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.manualUnits.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
