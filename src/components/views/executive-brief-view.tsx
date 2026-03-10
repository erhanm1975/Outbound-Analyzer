import React, { useMemo } from 'react';
import { type AnalysisResult, type BufferConfig } from '../../types';
import { DollarSign, Activity, PieChart as PieChartIcon, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdaptationStats } from '../../hooks/useAdaptationStats';

interface ExecutiveBriefViewProps {
    analysis: AnalysisResult;
    config: BufferConfig;
}

export function ExecutiveBriefView({ analysis, config }: ExecutiveBriefViewProps) {
    const wage = config.hourlyWage ?? 22;

    // --- Pillar 1: Financial Friction ---
    const hoursLost = (analysis.stats.totalTimeOffTask || 0) / 60;
    const financialBleed = hoursLost * wage;

    // --- Pillar 2: Throughput & Bottleneck ---
    const masterScore = analysis.stats.dynamicIntervalUPH || 0;
    const pickUph = analysis.stats.picking?.dynamicIntervalUPH || 0;
    const sortUph = analysis.stats.sorting?.dynamicIntervalUPH || 0;
    const packUph = analysis.stats.packing?.dynamicIntervalUPH || 0;

    const pickVol = analysis.stats.picking?.totalVolume || 0;
    const sortVol = analysis.stats.sorting?.totalVolume || 0;
    const packVol = analysis.stats.packing?.totalVolume || 0;

    const volList = [
        { name: 'Picking', val: pickVol },
        { name: 'Sorting', val: sortVol },
        { name: 'Packing', val: packVol }
    ].filter(a => a.val > 0);

    const bottleneck = volList.length > 0 ? volList.reduce((prev, curr) => prev.val < curr.val ? prev : curr) : { name: 'None', val: 0 };
    const bestVol = volList.length > 0 ? volList.reduce((prev, curr) => prev.val > curr.val ? prev : curr) : null;

    // Bottleneck Context logic
    let bottleneckContext = "Insufficient volume data to detect bottlenecks.";
    if (bottleneck.val > 0 && bestVol && bestVol.val > 0 && bottleneck.name !== bestVol.name) {
        const percentLess = Math.round((1 - (bottleneck.val / bestVol.val)) * 100);
        bottleneckContext = `${bottleneck.name} is the primary constraint today, processing ${percentLess}% less volume than ${bestVol.name} (${bestVol.val.toLocaleString()} vs ${bottleneck.val.toLocaleString()}).`;
    }

    // --- Pillar 3: AI System Utilization ---
    const aiStats = useAdaptationStats(analysis.records, config);
    const adaptationIndex = aiStats?.adaptationIndex || 0;
    const aiOrderPct = aiStats?.aiOrderPct || 0;

    // --- Pillar 4: Workforce Allocation ---
    const pickHours = analysis.stats.picking?.totalActiveTime || 0;
    const sortHours = analysis.stats.sorting?.totalActiveTime || 0;
    const packHours = analysis.stats.packing?.totalActiveTime || 0;

    const allocationData = [
        { name: 'Picking', value: pickHours, color: '#6366f1' }, // Indigo
        { name: 'Sorting', value: sortHours, color: '#a855f7' }, // Purple
        { name: 'Packing', value: packHours, color: '#f59e0b' }, // Amber
        { name: 'Inactivity (Gap)', value: hoursLost, color: '#f43f5e' } // Rose
    ].filter(d => d.value > 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Executive Brief</h1>
                <p className="text-slate-500 dark:text-slate-400">High-level operational health and throughput snapshot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Pillar 1: Financial Friction */}
                <div className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Financial Friction</h2>
                            <p className="text-xs text-slate-500">Estimated payroll bleed from inactivity</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="text-4xl font-black text-rose-600 dark:text-rose-400 mb-2">
                            ${Math.round(financialBleed).toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
                            Wasted Today (@ ${wage.toFixed(2)}/hr)
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                            <span className="text-sm text-slate-500">Total Hours Lost to Inactivity</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{hoursLost.toFixed(1)} hrs</span>
                        </div>
                    </div>
                </div>

                {/* Pillar 2: Throughput & Bottleneck */}
                <div className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Shift Throughput</h2>
                            <p className="text-xs text-slate-500">Capacity and operational bottlenecks</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-end justify-between mb-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Master Norm Score</div>
                                <div className="text-4xl font-black text-emerald-500">{Math.round(masterScore)} UPH</div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="text-xs font-mono text-indigo-400 font-medium">Pick: <span className="text-slate-200">{Math.round(pickUph)}</span></div>
                                <div className="text-xs font-mono text-purple-400 font-medium">Sort: <span className="text-slate-200">{Math.round(sortUph)}</span></div>
                                <div className="text-xs font-mono text-amber-400 font-medium">Pack: <span className="text-slate-200">{Math.round(packUph)}</span></div>
                            </div>
                        </div>
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">Bottleneck Indicator:</span> {bottleneckContext}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pillar 3: AI System Utilization */}
                <div className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Adaptation Insights</h2>
                            <p className="text-xs text-slate-500">System utilization and wave planner adoption</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="text-4xl font-black text-emerald-500 mb-2">
                            {adaptationIndex.toFixed(2)}
                        </div>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
                            Adaptation Index Score (Target &gt; 6.0)
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">AI Order Penetration</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{aiOrderPct.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pillar 4: Workforce Allocation */}
                <div className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <PieChartIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Workforce Allocation</h2>
                            <p className="text-xs text-slate-500">Total labor hours distribution</p>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center -ml-4 pr-4">
                        <div className="w-1/2 h-44 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                        formatter={(value: number) => [`${value.toFixed(1)} hrs`, 'Hours']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 flex flex-col gap-2">
                            {allocationData.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-slate-400">{entry.name}</span>
                                    </div>
                                    <span className="font-semibold text-slate-200">{entry.value.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
