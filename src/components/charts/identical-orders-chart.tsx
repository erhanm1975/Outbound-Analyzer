import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Layers, Box } from 'lucide-react';

interface IdenticalOrdersChartProps {
    identicalItemOrders?: { id: string; count: number }[];
    identicalOrders?: { id: string; count: number }[];
}

export function IdenticalOrdersChart({ identicalItemOrders = [], identicalOrders = [] }: IdenticalOrdersChartProps) {
    const topItemOrders = identicalItemOrders.slice(0, 15);
    const topMultiOrders = identicalOrders.slice(0, 15);
    const hasData = topItemOrders.length > 0 || topMultiOrders.length > 0;

    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                Highly Duplicated Orders
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm mb-6">
                Identifies order configurations (exact SKUs and quantities) that occur more than 1 time in the dataset. High duplication indicates potential for batching or kit creation.
            </p>

            {hasData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Identical Single-Item Orders */}
                    {topItemOrders.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800/60">
                            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <Box className="w-4 h-4 text-emerald-500" />
                                Identical Single-Item Orders <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Count &gt; 1)</span>
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={topItemOrders}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="id"
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            width={120}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                borderColor: 'rgba(51, 65, 85, 0.8)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                            }}
                                            formatter={(value: any) => [`${value} Occurrences`, 'Frequency']}
                                        />
                                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Identical Multi-Item Orders */}
                    {topMultiOrders.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800/60">
                            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                Identical Multi-Item Orders <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Count &gt; 1)</span>
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={topMultiOrders}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="id"
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            width={120}
                                            tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                borderColor: 'rgba(51, 65, 85, 0.8)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                            }}
                                            formatter={(value: any) => [`${value} Occurrences`, 'Frequency']}
                                        />
                                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <Box className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-lg">No Highly Duplicated Orders Found</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                        All order configurations in this dataset are either unique or do not meet the minimum duplication threshold.
                    </p>
                </div>
            )}
        </div>
    );
}
