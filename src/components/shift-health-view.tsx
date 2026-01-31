import { Users, Box, MapPin, Globe } from 'lucide-react';
import { type AnalysisResult } from '../logic/analysis';
import { OrderProfileChart } from './charts/OrderProfileChart';
import { WorkforceChart } from './charts/WorkforceChart';
import { TaskFlowVisual } from './charts/TaskFlowVisual';
import { JobVolumeChart } from './charts/JobVolumeChart';
import { WaveVolumeChart } from './charts/WaveVolumeChart';
// The user design merges the "Shift Report" header with "Data Health" status.
// We will implement this new Header inside ShiftHealthView.

interface ShiftHealthViewProps {
    analysis: AnalysisResult;
}

// New StatCard matching the "glass-card p-6 rounded-3xl" design
function StatCard({ label, value, icon: Icon, colorClass, shadowClass }: {
    label: string;
    value: string | number;
    icon: any;
    colorClass: string; // e.g. "from-blue-500 to-indigo-600"
    shadowClass: string; // e.g. "shadow-[0_0_20px_rgba(59,130,246,0.5)]"
}) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white ${shadowClass}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {/* Info Icon placeholder */}
                <div className="bg-white/50 p-1 rounded-full">
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{label}</h3>
            <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
    );
}

export function ShiftHealthView({ analysis }: ShiftHealthViewProps) {
    const { health, stats } = analysis;

    // Prepare data for JobVolumeChart
    const jobVolumeData = health.jobTypeStats.map(s => ({
        jobType: s.jobType,
        totalJobs: s.totalJobs,
        avgUnits: s.avgUnitsPerJob,
        avgOrders: s.avgOrdersPerJob
    }));

    return (
        <div className="relative min-h-screen p-4 lg:p-8 font-sans text-slate-700 w-full max-w-[1600px] mx-auto animate-in fade-in duration-700">

            {/* Background Blobs (Absolute Positioned) */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse"></div>
            <div className="fixed top-1/2 right-0 w-[30rem] h-[30rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 translate-x-1/4 -translate-y-1/2 -z-10"></div>
            <div className="fixed bottom-0 left-1/3 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 translate-y-1/3 -z-10"></div>

            {/* Header Section Removed (Now Global) */}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Units"
                    value={health.totalUnits.toLocaleString()}
                    icon={Box}
                    colorClass="from-blue-500 to-indigo-600"
                    shadowClass="shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                />
                <StatCard
                    label="Distinct Users"
                    value={health.totalDistinctEmployees}
                    icon={Users}
                    colorClass="from-purple-500 to-fuchsia-600"
                    shadowClass="shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                />
                <StatCard
                    label="Unique Visits"
                    value={health.uniqueLocsVisited.toLocaleString()}
                    icon={MapPin}
                    colorClass="from-cyan-400 to-blue-500"
                    shadowClass="shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                />
                <StatCard
                    label="Physical Footprint"
                    value={health.totalUniqueLocations.toLocaleString()}
                    icon={Globe}
                    colorClass="from-emerald-400 to-teal-600"
                    shadowClass="shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* 1. Order Profile (Donut) */}
                <OrderProfileChart
                    single={health.singleItemOrders}
                    multi={health.multiItemOrders}
                    total={health.totalOrders}
                />

                {/* 2. Task Performance (Flow) */}
                <TaskFlowVisual
                    pickTime={health.avgPickDurationSec}
                    travelTime={health.avgTravelTimeSec}
                    packTime={health.avgPackDurationSec}
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
