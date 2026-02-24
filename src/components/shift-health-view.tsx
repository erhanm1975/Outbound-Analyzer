import { Users, Box, MapPin, Globe, Info } from 'lucide-react';
import { type AnalysisResult } from '../types';
import { OrderProfileChart } from './charts/OrderProfileChart';
import { WorkforceChart } from './charts/WorkforceChart';
import { JobVolumeChart } from './charts/JobVolumeChart';
import { WaveVolumeChart } from './charts/WaveVolumeChart';
import { RichTooltip } from './rich-tooltip';
import { METRIC_TOOLTIPS } from '../logic/metric-definitions';

// ... (existing imports)

// New StatCard matching the "glass-card p-6 rounded-3xl" design
function StatCard({ label, value, icon: Icon, colorClass, shadowClass, tooltip }: {
    label: string;
    value: string | number;
    icon: any;
    colorClass: string; // e.g. "from-blue-500 to-indigo-600"
    shadowClass: string; // e.g. "shadow-[0_0_20px_rgba(59,130,246,0.5)]"
    tooltip?: React.ReactNode;
}) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-md p-6 shadow-none group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white ${shadowClass}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {tooltip && (
                    <div className="bg-slate-800/50 p-1.5 rounded-full cursor-help hover:bg-slate-800 transition-colors">
                        <RichTooltip content={tooltip}>
                            <Info className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                        </RichTooltip>
                    </div>
                )}
            </div>
            <h3 className="text-slate-400 text-sm font-medium">{label}</h3>
            <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
        </div>
    );
}

interface ShiftHealthViewProps {
    analysis: any; // using any to bypass strict check for now, ideally Import AnalysisResult
}

export function ShiftHealthView({ analysis }: ShiftHealthViewProps) {
    const { health, stats } = analysis;

    // Prepare data for JobVolumeChart
    const jobVolumeData = health.jobTypeStats.map((s: any) => ({
        jobType: s.jobType,
        totalJobs: s.totalJobs,
        avgUnits: s.avgUnitsPerJob,
        avgOrders: s.avgOrdersPerJob
    }));

    return (
        <div className="relative min-h-screen p-4 lg:p-8 font-sans text-slate-300 w-full animate-in fade-in duration-700">

            {/* Background Blobs (Absolute Positioned) */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-blue-900/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse"></div>
            <div className="fixed top-1/2 right-0 w-[30rem] h-[30rem] bg-purple-900/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 translate-x-1/4 -translate-y-1/2 -z-10"></div>
            <div className="fixed bottom-0 left-1/3 w-80 h-80 bg-cyan-900/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 translate-y-1/3 -z-10"></div>

            {/* Header Section Removed (Now Global) */}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Units"
                    value={health.totalUnits.toLocaleString()}
                    icon={Box}
                    colorClass="from-blue-500 to-indigo-600"
                    shadowClass="shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    tooltip={METRIC_TOOLTIPS.SHIFT_TOTAL_UNITS}
                />
                <StatCard
                    label="Distinct Users"
                    value={health.totalDistinctEmployees}
                    icon={Users}
                    colorClass="from-purple-500 to-fuchsia-600"
                    shadowClass="shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                    tooltip={METRIC_TOOLTIPS.SHIFT_DISTINCT_USERS}
                />
                <StatCard
                    label="Unique Visits"
                    value={health.uniqueLocsVisited.toLocaleString()}
                    icon={MapPin}
                    colorClass="from-cyan-400 to-blue-500"
                    shadowClass="shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    tooltip={METRIC_TOOLTIPS.SHIFT_UNIQUE_VISITS}
                />
                <StatCard
                    label="Physical Footprint"
                    value={health.totalUniqueLocations.toLocaleString()}
                    icon={Globe}
                    colorClass="from-emerald-400 to-teal-600"
                    shadowClass="shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    tooltip={METRIC_TOOLTIPS.SHIFT_PHYSICAL_FOOTPRINT}
                />
            </div>
            {/* ... rest of the file ... */}
            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* 1. Order Profile (Donut) */}
                <OrderProfileChart
                    single={health.singleItemOrders}
                    multi={health.multiItemOrders}
                    total={health.totalOrders}
                />



                {/* 3. Workforce (Stacked Cards) */}
                <WorkforceChart
                    pickers={health.uniquePickers}
                    packers={health.uniquePackers}
                    crossTrained={health.crossTrainedEmployees}
                />
            </div>

            {/* Bottom Row / Job Volume & Wave Volume */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-8">
                <div className="lg:col-span-3">
                    <JobVolumeChart
                        data={jobVolumeData}
                        efficiencyScore={Math.round(stats.utilization)}
                    />
                </div>

                {/* Wave Volume Chart */}
                <div className="lg:col-span-3">
                    <WaveVolumeChart data={health.waveStats} />
                </div>
            </div>

        </div>
    );
}
