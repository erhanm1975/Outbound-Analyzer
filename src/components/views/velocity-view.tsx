import { METRIC_TOOLTIPS, RichTooltipContainer } from '../../logic/metric-definitions';
import { RichTooltip } from '../ui/rich-tooltip';
import React, { useMemo } from 'react';
import type { AnalysisResult, ShiftRecord } from '../../types';
import { useHelp } from '../../contexts/help-context';
import { VelocityGuide } from '../guide/velocity-guide';
import { format } from 'date-fns';
import { bucketRecords, type ExtendedFlowData } from '../../logic/flow-utils';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface Props {
    analysis: AnalysisResult;
    benchmark?: AnalysisResult;
    isLive?: boolean;
    rawRecords?: ShiftRecord[];
}

export function VelocityView({ analysis, benchmark, isLive = false, rawRecords = [] }: Props) {
    const { openHelp } = useHelp();
    const handleOpenGuide = (id: string) => {
        openHelp(<VelocityGuide scrollToId={id} />);
    };
    const { stats, health } = analysis;
    // Calculated Metrics
    const productiveUPH = stats.productiveUPH || 0;
    const flowVelocity = stats.uph || 0;
    const floorUPH = stats.floorUPH || 0;
    const outputDensity = stats.outputDensity || 0;
    const shiftAvgFlowUPH = stats.picking.shiftAvgFlowUPH || 0; // NEW

    // Targets (Dynamic Benchmark)
    const benchmarkStats = benchmark?.stats;
    const targetProductive = benchmarkStats?.productiveUPH;
    const targetFlow = benchmarkStats?.uph;
    const targetFloor = benchmarkStats?.floorUPH;
    const targetDensity = benchmarkStats?.outputDensity;

    // Breakdown Times
    const interJobTimeStr = formatDuration(health.avgJobTransitionMin * 60);
    const pickTimeStr = formatDuration(stats.picking.avgProcessTimeSec);
    const travelTimeStr = formatDuration(health.avgTravelTimeSec);
    const sortTimeStr = formatDuration(stats.sorting.avgProcessTimeSec);
    const packTimeStr = formatDuration(stats.packing.avgProcessTimeSec);
    const breakTimeStr = formatDuration(0);

    // Flow Audit Chart Data (Facility Output by Process (Volume) - Hourly Intervals)
    // We default to 60 minute intervals and volume mode as requested.
    const consolidatedChartData = useMemo(() => {
        if (!rawRecords || rawRecords.length === 0) return [];

        const PROCESS_FILTERS = { picking: 'picking', sorting: 'sort', packing: 'packing' };

        const pickRecs = rawRecords.filter(r => (r.TaskType || '').toLowerCase().includes(PROCESS_FILTERS.picking));
        const sortRecs = rawRecords.filter(r => (r.TaskType || '').toLowerCase().includes(PROCESS_FILTERS.sorting));
        const packRecs = rawRecords.filter(r => (r.TaskType || '').toLowerCase().includes(PROCESS_FILTERS.packing));

        const pickData = bucketRecords(pickRecs, 60);
        const sortData = bucketRecords(sortRecs, 60);
        const packData = bucketRecords(packRecs, 60);

        const allTimes = new Map<string, { time: string; pick: number; sort: number; pack: number; total?: number }>();

        const addIntervals = (data: ExtendedFlowData, key: 'pick' | 'sort' | 'pack') => {
            data.intervals.forEach(interval => {
                const t = format(interval.intervalStart, 'HH:mm');
                if (!allTimes.has(t)) allTimes.set(t, { time: t, pick: 0, sort: 0, pack: 0 });
                const entry = allTimes.get(t)!;
                entry[key] = interval.volume;
            });
        };

        addIntervals(pickData, 'pick');
        addIntervals(sortData, 'sort');
        addIntervals(packData, 'pack');

        return [...allTimes.values()]
            .map(entry => {
                entry.total = entry.pick + entry.sort + entry.pack;
                return entry;
            })
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [rawRecords]);

    return (
        <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Performance Dashboard</h1>
                    <p className="text-slate-400 text-sm">Velocity Dashboard • Flow Centric</p>
                </div>

                {/* Controls Mockup */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => openHelp(<VelocityGuide />)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                        Open Guide
                    </button>

                    <div className="hidden md:flex items-center px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
                        {isLive ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2 animate-pulse"></span>
                                Live Feed
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
                                Static Snapshot
                            </>
                        )}
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* LEFT COLUMN: Productive Picked UPH & Efficiency Score */}
                <div className="xl:col-span-3 h-full flex flex-col gap-6">
                    {/* Productive Picked UPH */}
                    <div className="glass-panel metric-mesh-blue rounded-xl p-6 relative overflow-visible group hover:border-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 flex-1 flex flex-col justify-center bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleOpenGuide('productive-picked-uph')} className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner shadow-blue-500/5 hover:bg-blue-500/20 hover:scale-105 transition-all cursor-pointer" title="Read about Productive Picked UPH in the User Guide">
                                    <span className="material-symbols-outlined text-2xl">bolt</span>
                                </button>
                                <div>
                                    <p className="text-white text-base font-semibold">Productive Picked UPH</p>
                                    <p className="text-slate-400 text-[11px] mt-0.5 font-medium tracking-wide">Average UPH per Picker (Excluding Breaks)</p>
                                </div>
                            </div>
                            {/* Tooltip Trigger */}
                            <RichTooltip content={METRIC_TOOLTIPS.PRODUCTIVE_UPH}>
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                            </RichTooltip>
                        </div>

                        <div className="mb-2 mt-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h3 className="text-5xl font-bold text-white tracking-tight tabular-nums">{productiveUPH.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <span className="text-[10px] text-slate-500 font-mono">UNITS/HR</span>
                            </div>
                            {targetProductive !== undefined && (
                                <TrendBadge value={productiveUPH} target={targetProductive} color="emerald" small />
                            )}
                        </div>

                        {targetProductive !== undefined && (
                            <ProgressBar value={productiveUPH} max={targetProductive * 1.2} color="blue" small />
                        )}

                        {targetProductive !== undefined && (
                            <div className="flex justify-between text-xs mt-2">
                                <span className="text-slate-500">Benchmark: <span className="text-slate-300 font-mono">{targetProductive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                            </div>
                        )}
                    </div>

                    {/* Efficiency Score (Utilization) */}
                    <div className="glass-panel metric-mesh-cyan rounded-xl p-6 relative overflow-visible group hover:border-cyan-500/40 transition-all duration-300 transform hover:-translate-y-1 flex-1 flex flex-col justify-center bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleOpenGuide('efficiency-score-utilization')} className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 shadow-inner shadow-cyan-500/5 hover:bg-cyan-500/20 hover:scale-105 transition-all cursor-pointer" title="Read about Efficiency Score in the User Guide">
                                    <span className="material-symbols-outlined text-2xl">speed</span>
                                </button>
                                <div>
                                    <p className="text-white text-base font-semibold">Efficiency Score</p>
                                    <p className="text-slate-400 text-[11px] mt-0.5 font-medium tracking-wide">Facility-Wide Utilization Percentage</p>
                                </div>
                            </div>
                            {/* Tooltip */}
                            <RichTooltip content={
                                <RichTooltipContainer
                                    title="Efficiency Score"
                                    description="Percentage of shift time spent on active work vs. idle/gap time."
                                    formula="(Active Wall Clock Time / Total Shift Span) * 100"
                                    example={
                                        <p>A warehouse operates a 10-hour shift (600 minutes). Across all pickers, they spend 90 minutes on break, 30 minutes idle, and 480 minutes actively picking. The Facility Efficiency Score is 80% (480 / 600).</p>
                                    }
                                />
                            }>
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                            </RichTooltip>
                        </div>

                        <div className="mb-2 mt-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h3 className="text-5xl font-bold text-white tracking-tight tabular-nums">{Math.round(stats.utilization)}</h3>
                                <span className="text-[10px] text-slate-500 font-mono">%</span>
                            </div>
                            {benchmarkStats?.utilization !== undefined && (
                                <TrendBadge value={stats.utilization} target={benchmarkStats.utilization} color="emerald" small />
                            )}
                        </div>

                        {benchmarkStats?.utilization !== undefined && (
                            <ProgressBar value={stats.utilization} max={100} color="cyan" small />
                        )}

                        {benchmarkStats?.utilization !== undefined && (
                            <div className="flex justify-between text-xs mt-2">
                                <span className="text-slate-500">Benchmark: <span className="text-slate-300 font-mono">{Math.round(benchmarkStats.utilization)}%</span></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER: Pick Flow Velocity (Hero) & Avg Flow UPH */}
                <div className="xl:col-span-6 flex flex-col h-full gap-6">
                    {/* Pick Velocity */}
                    <div className="hero-panel w-full rounded-2xl p-6 relative overflow-visible group hover:border-cyan-500/50 transition-all duration-500 flex flex-col items-center justify-center flex-1 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 shadow-2xl">
                        <div className="absolute inset-0 bg-hero-glow pointer-events-none overflow-hidden rounded-2xl"></div>
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none"><div className="absolute top-0 right-0 p-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors"></div></div>

                        <div className="absolute top-6 left-6 z-20">
                            <button onClick={() => handleOpenGuide('pick-flow-velocity')} className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-inner shadow-cyan-500/5 hover:bg-cyan-500/20 hover:scale-105 transition-all cursor-pointer" title="Read about Pick Flow Velocity in the User Guide">
                                <span className="material-symbols-outlined text-xl">menu_book</span>
                            </button>
                        </div>

                        <div className="relative z-10 text-center flex flex-col items-center justify-center flex-1 w-full">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <h2 className="text-slate-300 text-sm font-bold tracking-[0.2em] uppercase">Pick Flow Velocity</h2>
                                <RichTooltip content={METRIC_TOOLTIPS.UPH_HOURLY_AVG}>
                                    <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                                </RichTooltip>
                            </div>
                            <p className="text-cyan-400/80 text-[10px] font-semibold tracking-wider font-mono">AVERAGE UPH PER PICKER (AGGREGATE)</p>

                            <div className="flex items-baseline justify-center gap-2 my-4">
                                <span className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 tracking-tighter tabular-nums drop-shadow-2xl leading-none">
                                    {flowVelocity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <p className="text-lg text-slate-300 font-medium mb-4">Facility : Units per Labor Hour</p>

                            {targetFlow !== undefined && (
                                <div className="flex items-center justify-center gap-6 text-sm">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700 shadow-lg">
                                        <span className="text-slate-500 font-medium">Target</span>
                                        <span className="font-mono font-bold text-white text-lg">{targetFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <TrendBadgeLarge value={flowVelocity} target={targetFlow} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lower Center: Avg Flow UPH */}
                    <div className="hero-panel w-full rounded-2xl p-6 relative overflow-visible group hover:border-indigo-500/50 transition-all duration-500 flex flex-col items-center justify-center flex-1 bg-slate-900/80 backdrop-blur-xl border border-indigo-500/20 shadow-2xl">
                        <div className="absolute inset-0 bg-hero-glow pointer-events-none overflow-hidden rounded-2xl opacity-50"></div>
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none"><div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div></div>

                        <div className="absolute top-6 left-6 z-20">
                            <button onClick={() => handleOpenGuide('pick-flow-velocity')} className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner shadow-indigo-500/5 hover:bg-indigo-500/20 hover:scale-105 transition-all cursor-pointer" title="Read about Average Flow UPH in the User Guide">
                                <span className="material-symbols-outlined text-xl">menu_book</span>
                            </button>
                        </div>

                        <div className="relative z-10 text-center flex flex-col items-center justify-center flex-1 w-full">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <h2 className="text-slate-300 text-sm font-bold tracking-[0.2em] uppercase">Avg Flow UPH</h2>
                                <RichTooltip content={
                                    <RichTooltipContainer
                                        title="Shift Average Flow UPH"
                                        description="Calculated using strict 15-minute intervals across the shift. This methodology normalizes picking flow into an hourly projection per interval. It ensures that dormant periods across unutilized intervals do not dilute the mathematical pace of the active shift."
                                        formula="∑ User Avg / Total Active Users"
                                        example={
                                            <p>A picker works hard from 8:00 to 9:00, picking 200 units (Interval UPH = 200). Then they go to lunch from 9:00 to 10:00 (Interval UPH = 0). The Shift Avg Flow UPH completely ignores the empty 9:00-10:00 block, protecting the worker's 200 UPH performance limit.</p>
                                        }
                                    />
                                }>
                                    <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                                </RichTooltip>
                            </div>
                            <p className="text-indigo-400/80 text-[10px] font-semibold tracking-wider font-mono">HOURLY PROJECTION OVER ACTIVE INTERVALS</p>

                            <div className="flex items-baseline justify-center gap-2 my-4">
                                <span className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-400 tracking-tighter tabular-nums drop-shadow-2xl leading-none">
                                    {shiftAvgFlowUPH.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <p className="text-lg text-slate-300 font-medium">Shift-Level Picker Output Flow</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Floor Picked UPH & Pick Density */}
                <div className="xl:col-span-3 h-full flex flex-col gap-6">

                    {/* Floor Picked UPH */}
                    <div className="glass-panel metric-mesh-emerald rounded-xl p-6 relative overflow-visible group hover:border-emerald-500/40 transition-all duration-300 transform hover:-translate-y-1 flex-1 flex flex-col justify-center bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleOpenGuide('floor-picked-uph')} className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner shadow-emerald-500/5 hover:bg-emerald-500/20 hover:scale-105 transition-all cursor-pointer" title="Read about Floor Picked UPH in the User Guide">
                                    <span className="material-symbols-outlined text-2xl">conveyor_belt</span>
                                </button>
                                <div>
                                    <p className="text-white text-base font-semibold">Floor Picked UPH</p>
                                    <p className="text-slate-400 text-[11px] mt-0.5 font-medium tracking-wide">Pure Mechanical Task Speed per Picker</p>
                                </div>
                            </div>
                            {/* Tooltip */}
                            <RichTooltip content={METRIC_TOOLTIPS.FLOOR_UPH}>
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                            </RichTooltip>
                        </div>

                        <div className="mb-2 mt-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h3 className="text-5xl font-bold text-white tracking-tight tabular-nums">{floorUPH.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <span className="text-[10px] text-slate-500 font-mono">UNITS/HR</span>
                            </div>
                            {targetFloor !== undefined && (
                                <TrendBadge value={floorUPH} target={targetFloor} color="emerald" small />
                            )}
                        </div>
                        {targetFloor !== undefined && (
                            <ProgressBar value={floorUPH} max={targetFloor * 1.2} color="emerald" small />
                        )}
                        {targetFloor !== undefined && (
                            <div className="flex justify-between text-xs mt-2">
                                <span className="text-slate-500">Benchmark: <span className="text-slate-300 font-mono">{targetFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                            </div>
                        )}
                    </div>

                    {/* Pick Density */}
                    <div className="glass-panel metric-mesh-amber rounded-xl p-6 relative overflow-visible group hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1 flex-1 flex flex-col justify-center bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleOpenGuide('pick-density')} className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-inner shadow-amber-500/5 hover:bg-amber-500/20 hover:scale-105 transition-all cursor-pointer" title="Read about Pick Density in the User Guide">
                                    <span className="material-symbols-outlined text-2xl">widgets</span>
                                </button>
                                <div>
                                    <p className="text-white text-base font-semibold">Pick Density</p>
                                    <p className="text-slate-400 text-[11px] mt-0.5 font-medium tracking-wide">Average Units per Location Stop</p>
                                </div>
                            </div>
                            {/* Tooltip */}
                            <RichTooltip content={METRIC_TOOLTIPS.OUTPUT_DENSITY}>
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                            </RichTooltip>
                        </div>

                        <div className="mb-2 mt-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h3 className="text-5xl font-bold text-white tracking-tight tabular-nums">{outputDensity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <span className="text-[10px] text-slate-500 font-mono">UNITS/LOC</span>
                            </div>
                            {targetDensity !== undefined && (
                                <TrendBadge value={outputDensity} target={targetDensity} color="pink" small invert />
                            )}
                        </div>
                        {targetDensity !== undefined && (
                            <ProgressBar value={outputDensity} max={targetDensity * 1.5} color="amber" small />
                        )}
                        {targetDensity !== undefined && (
                            <div className="flex justify-between text-xs mt-2">
                                <span className="text-slate-500">Benchmark: <span className="text-slate-300 font-mono">{targetDensity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Facility Output by Process (Moved from Flow Audit) */}
            {consolidatedChartData && consolidatedChartData.length > 0 && (
                <section className="glass-panel rounded-xl p-8 border-t border-blue-500/20 bg-slate-900/60 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                <button onClick={() => handleOpenGuide('facility-output-process')} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 hover:scale-105 transition-all cursor-pointer flex items-center justify-center" title="Read about Facility Output in the User Guide">
                                    <span className="material-symbols-outlined text-xl">bar_chart</span>
                                </button>
                                Facility Output by Process (Volume)
                                <RichTooltip content={
                                    <RichTooltipContainer
                                        title="Facility Output Process Flow"
                                        description="Visualizes the absolute number of units processed per hour. The engine synchronizes all timestamped tasks across Pick, Sort, and Pack phases into strict 60-minute intervals."
                                        formula="Total Units Processed per Phase per Hour"
                                        example={
                                            <p>If picking activity spans from 08:15 AM to 09:45 AM yielding 500 units, the engine strictly buckets the volume into the 08:00 AM bar (e.g. 300 units) and the 09:00 AM bar (e.g. 200 units).</p>
                                        }
                                    />
                                }>
                                    <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm ml-1">info</span>
                                </RichTooltip>
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">Aggregated throughput volume in hourly intervals aligned with shift rhythm.</p>
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={consolidatedChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barGap={2} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.toLocaleString()}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                />
                                <Bar dataKey="pick" name="Picking" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="sort" name="Sorting" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pack" name="Packing" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="total" name="Total Throughput" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}

            {/* Timeline Section */}
            <section className="glass-panel rounded-xl p-8 border-t border-blue-500/20 flex-1 flex flex-col bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-500 text-3xl">timeline</span>
                        Task Performance Breakdown
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-slate-400 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Value Add
                        </div>
                        <div className="h-4 w-[1px] bg-slate-700"></div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Non-Value Add
                        </div>
                    </div>
                </div>

                <div className="relative pt-8 pb-12 flex-1 flex items-center">
                    {/* Connector Line */}
                    <div className="absolute top-[50%] left-0 right-0 h-[3px] bg-slate-800 z-0 -translate-y-1/2"></div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-8 w-full relative z-10">

                        {/* 1. Inter-Job */}
                        <TimelineNode
                            icon="schedule"
                            label="Inter-Job"
                            value={interJobTimeStr}
                            unit="avg / job gap"
                            step={1}
                            color="slate"
                        />

                        {/* 2. Pick Time */}
                        <TimelineNode
                            icon="shopping_cart"
                            label="Pick Time"
                            value={pickTimeStr}
                            unit="avg / task"
                            step={2}
                            color="blue"
                            active
                        />

                        {/* 3. Travel */}
                        <TimelineNode
                            icon="local_shipping"
                            label="Travel"
                            value={travelTimeStr}
                            unit="avg / task"
                            step={3}
                            color="slate"
                        />

                        {/* 4. Sort (If > 0) */}
                        <TimelineNode
                            icon="swap_horiz"
                            label="Sort"
                            value={sortTimeStr}
                            unit="avg / task"
                            step={4}
                            color="cyan"
                            active={stats.sorting.avgProcessTimeSec > 0}
                            dimmed={stats.sorting.avgProcessTimeSec === 0}
                        />

                        {/* 5. Pack */}
                        <TimelineNode
                            icon="inventory_2"
                            label="Pack"
                            value={packTimeStr}
                            unit="avg / task"
                            step={5}
                            color="pink"
                            active
                        />

                        {/* 6. Break */}
                        <TimelineNode
                            icon="free_breakfast"
                            label="Break"
                            value={breakTimeStr}
                            unit="per shift"
                            step={6}
                            color="rose"
                        />

                    </div>
                </div>
            </section>

        </div>
    );
}

// -- Helper Components --

function formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
}

function TrendBadge({ value, target, color, small, invert }: { value: number, target: number, color: string, small?: boolean, invert?: boolean }) {
    if (!target) return null;
    const diff = value - target;
    const pct = (diff / target) * 100;
    const isPositive = diff > 0;
    // Good if positive (unless inverted like density inverse?) No, output density is units/loc, higher is better? 
    // Wait, provided HTML for density says "Units/Loc" and trends down (-2%). 
    // And visit density (locs/unit) lower is better. Output density (units/loc) higher is better.
    // So usually positive is good for UPH and Density.
    const isGood = invert ? !isPositive : isPositive;

    // Using Tailwind classes dynamically can be tricky if not safelisted, but let's try standard colors.
    // Assuming simple mapping: emerald for good, rose for bad.

    const colorClass = isGood ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    const icon = isPositive ? 'trending_up' : 'trending_down';

    return (
        <span className={`px-1.5 py-0.5 rounded text-[${small ? '10px' : 'xs'}] font-bold border flex items-center w-fit mt-1 ${colorClass}`}>
            <span className={`material-symbols-outlined text-[${small ? '10px' : 'xs'}] mr-1`}>{icon}</span>
            {Math.abs(pct).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </span>
    );
}

function TrendBadgeLarge({ value, target }: { value: number, target: number }) {
    if (!target) return null;
    const diff = value - target;
    const pct = (diff / target) * 100;
    const isPositive = diff > 0;
    const colorClass = isPositive ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border-rose-500/20';

    return (
        <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border shadow-lg ${colorClass}`}>
            <span className="material-symbols-outlined text-xl">{isPositive ? 'trending_up' : 'trending_down'}</span>
            <span className="font-bold text-xl">{isPositive ? '+' : ''}{Math.abs(pct).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
        </div>
    );
}

function ProgressBar({ value, max, color, small }: { value: number, max: number, color: string, small?: boolean }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    // Color mapping
    let bgClass = "bg-blue-400";
    if (color === 'emerald') bgClass = "bg-emerald-400";
    if (color === 'amber') bgClass = "bg-amber-400";
    if (color === 'pink') bgClass = "bg-pink-400";

    return (
        <div className={`w-full bg-slate-800/50 rounded-full h-${small ? '1.5' : '2'} mb-${small ? '2' : '3'} overflow-hidden mt-auto`}>
            <div className={`${bgClass} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
        </div>
    );
}

function TimelineNode({ icon, label, value, unit, step, color, active, dimmed }: any) {
    // Style Mapping based on color
    const colorClasses: Record<string, any> = {
        slate: { border: 'border-slate-700', text: 'text-slate-400', bg: 'bg-card-dark', iconColor: 'text-slate-400', badge: 'bg-slate-700' },
        blue: { border: 'border-blue-500', text: 'text-blue-400', bg: 'bg-card-dark', iconColor: 'text-blue-500', badge: 'bg-blue-500' },
        cyan: { border: 'border-cyan-400', text: 'text-cyan-400', bg: 'bg-card-dark', iconColor: 'text-cyan-400', badge: 'bg-cyan-400 text-black' },
        pink: { border: 'border-pink-500', text: 'text-pink-400', bg: 'bg-card-dark', iconColor: 'text-pink-500', badge: 'bg-pink-500' },
        rose: { border: 'border-rose-500', text: 'text-rose-400', bg: 'bg-card-dark', iconColor: 'text-rose-500', badge: 'bg-rose-900 group-hover:bg-rose-600' },
    };

    const c = colorClasses[color] || colorClasses.slate;
    const opacity = dimmed ? 'opacity-40 grayscale' : 'opacity-100';

    return (
        <div className={`flex flex-col items-center group ${opacity}`}>
            <div className={`size-20 rounded-full bg-[#0f172a] border-4 ${c.border} flex items-center justify-center mb-6 transition-colors shadow-2xl z-10 relative`}>
                <span className={`material-symbols-outlined ${c.iconColor} text-3xl`}>{icon}</span>
                <div className={`absolute -bottom-2 -right-2 ${c.badge} text-xs font-bold text-white w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#0f172a] shadow-lg`}>{step}</div>
            </div>
            <div className="text-center w-full">
                <p className={`text-sm ${c.text} font-bold uppercase tracking-widest mb-2`}>{label}</p>
                <p className="text-xl font-bold text-white font-mono bg-slate-800/50 px-4 py-1.5 rounded-lg border border-slate-700 inline-block shadow-lg">
                    {value}
                </p>
                {unit && (
                    <p className="text-[10px] text-slate-500 mt-1.5 uppercase tracking-wider font-medium">{unit}</p>
                )}
            </div>
        </div>
    );
}
