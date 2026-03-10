import { Cpu, User } from 'lucide-react';
import { type IngestionSummary, type AIVsManualStats } from '../../types';
import { RichTooltip } from '../ui/rich-tooltip';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { OrderProfileMatrix } from '../charts/order-profile-matrix';
import { IdenticalOrdersChart } from '../charts/identical-orders-chart';

interface DataHealthViewProps {
    summary: IngestionSummary;
    diagnostics?: {
        pickers: { user: string; reason: string }[];
        packers: { user: string; reason: string }[];
    };
    benchmarkSummary?: IngestionSummary;
    benchmarkDiagnostics?: {
        pickers: { user: string; reason: string }[];
        packers: { user: string; reason: string }[];
    };
    aiVsManualStats?: AIVsManualStats;
    orderSizeDistribution?: { sizeLabel: string; count: number; sortIndex: number }[];
    orderProfileMatrix?: { xLabels: string[]; yLabels: string[]; matrix: number[][]; maxCount: number };
    identicalItemOrders?: { id: string; count: number }[];
    identicalOrders?: { id: string; count: number }[];
}


export function DataHealthView({ summary, diagnostics, benchmarkSummary, benchmarkDiagnostics, aiVsManualStats, orderSizeDistribution, orderProfileMatrix, identicalItemOrders, identicalOrders }: DataHealthViewProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* AI vs Manual Jobs Breakdown */}
            {aiVsManualStats && (
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-indigo-500" />
                                AI vs Manual Data Breakdown
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                                Efficiency relies on structured data. Manual jobs without descriptions often lead to systemic inefficiencies.
                            </p>
                        </div>
                    </div>



                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        {/* Pie Chart */}
                        <div className="col-span-1 border-r border-slate-200 dark:border-slate-800 flex justify-center h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'AI Jobs', value: aiVsManualStats.aiJobs },
                                            { name: 'Manual Jobs', value: aiVsManualStats.manualJobs }
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
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Distinct Jobs</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                                            <Cpu className="w-4 h-4" /> AI Generated
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{aiVsManualStats.aiJobs.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-400 font-medium">
                                            <User className="w-4 h-4" /> Manual
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{aiVsManualStats.manualJobs.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Orders */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Orders Processed</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                                            <Cpu className="w-4 h-4" /> AI Generated
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{aiVsManualStats.aiOrders.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-400 font-medium">
                                            <User className="w-4 h-4" /> Manual
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{aiVsManualStats.manualOrders.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Units */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Units Processed</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-sm text-indigo-700 dark:text-indigo-400 font-medium">
                                            <Cpu className="w-4 h-4" /> AI Generated
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{aiVsManualStats.aiUnits.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-400 font-medium">
                                            <User className="w-4 h-4" /> Manual
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{aiVsManualStats.manualUnits.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Unit Distribution Chart */}
            {orderSizeDistribution && orderSizeDistribution.length > 0 && (
                <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">bar_chart</span>
                            Order Unit Distribution
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            Breakdown of orders processed based on total units contained within each order.
                        </p>
                    </div>

                    <div className="h-64 mt-4 select-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={orderSizeDistribution}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                <XAxis
                                    dataKey="sizeLabel"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{ value: 'Units in Order', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 12 }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{ value: 'Ord Count / Frequency', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                    formatter={(value: number) => [value.toLocaleString(), 'Orders']}
                                    labelFormatter={(label) => `${label} Unit${label === '1' ? '' : 's'}`}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#6366f1"
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* 3. Order Profile Matrix */}
            <div className="mb-8">
                {orderProfileMatrix && (
                    <OrderProfileMatrix
                        xLabels={orderProfileMatrix.xLabels}
                        yLabels={orderProfileMatrix.yLabels}
                        matrix={orderProfileMatrix.matrix}
                        maxCount={orderProfileMatrix.maxCount}
                    />
                )}
            </div>

            {/* 4. Highly Duplicated Orders Tracker */}
            <IdenticalOrdersChart
                identicalItemOrders={identicalItemOrders}
                identicalOrders={identicalOrders}
            />

        </div>
    );
}
