import { METRIC_TOOLTIPS } from '../logic/metric-definitions';
import React, { useMemo } from 'react';
import type { AnalysisResult } from '../types';

interface Props {
    analysis: AnalysisResult;
    benchmark?: AnalysisResult;
    isLive?: boolean;
}

export function VelocityView({ analysis, benchmark, isLive = false }: Props) {
    const { stats, health } = analysis;
    // Calculated Metrics
    const productiveUPH = stats.productiveUPH || 0;
    const flowVelocity = stats.uph || 0;
    const floorUPH = stats.floorUPH || 0;
    const outputDensity = stats.outputDensity || 0;

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

    return (
        <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Performance Dashboard</h1>
                    <p className="text-slate-400 text-sm">Velocity Dashboard • Flow Centric</p>
                </div>

                {/* Controls Mockup */}
                <div className="flex items-center gap-3">
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
            </header >

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* LEFT: Productive Picked UPH */}
                <div className="xl:col-span-3 h-full flex flex-col gap-6">
                    <div className="glass-panel metric-mesh-blue rounded-xl p-6 relative overflow-visible group hover:border-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col justify-center bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner shadow-blue-500/5">
                                    <span className="material-symbols-outlined text-3xl">bolt</span>
                                </div>
                                <div>
                                    <p className="text-white text-lg font-semibold">Productive Picked UPH</p>
                                </div>
                            </div>
                            {/* Tooltip Trigger */}
                            <div className="relative group/tooltip">
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs opacity-0 group-hover/tooltip:opacity-100 invisible group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none backdrop-blur-md">
                                    {METRIC_TOOLTIPS.PRODUCTIVE_UPH}
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 mt-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h3 className="text-6xl font-bold text-white tracking-tight tabular-nums">{productiveUPH.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <span className="text-xs text-slate-500 font-mono">UNITS/HR</span>
                            </div>
                            {targetProductive !== undefined && (
                                <TrendBadge value={productiveUPH} target={targetProductive} color="emerald" />
                            )}
                        </div>

                        {targetProductive !== undefined && (
                            <ProgressBar value={productiveUPH} max={targetProductive * 1.2} color="blue" />
                        )}

                        {targetProductive !== undefined && (
                            <div className="flex justify-between text-sm mt-3">
                                <span className="text-slate-500">Benchmark: <span className="text-slate-300 font-mono">{targetProductive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER: Pick Flow Velocity (Hero) */}
                <div className="xl:col-span-6 flex flex-col h-full">
                    <div className="hero-panel w-full h-full rounded-2xl p-8 relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 z-20 flex flex-col items-center justify-center min-h-[400px] bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 shadow-2xl">
                        <div className="absolute inset-0 bg-hero-glow pointer-events-none"></div>
                        <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors"></div>

                        <div className="relative z-10 text-center flex flex-col items-center justify-center flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-slate-400 text-lg font-medium tracking-[0.2em] uppercase">Pick Flow Velocity</h2>
                                <div className="relative group/tooltip">
                                    <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs opacity-0 group-hover/tooltip:opacity-100 invisible group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none backdrop-blur-md text-left">
                                        {METRIC_TOOLTIPS.UPH_HOURLY_AVG}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-baseline justify-center gap-2 my-4 scale-110 md:scale-125">
                                <span className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 tracking-tighter tabular-nums drop-shadow-2xl leading-none">
                                    {flowVelocity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <p className="text-2xl text-slate-300 font-medium mb-10">Facility : Picked Units per Labor Hour</p>

                            {targetFlow !== undefined && (
                                <div className="flex items-center gap-8 text-base">
                                    <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-900/50 border border-slate-700 shadow-lg">
                                        <span className="text-slate-500 font-medium">Benchmark</span>
                                        <span className="font-mono font-bold text-white text-xl">{targetFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <TrendBadgeLarge value={flowVelocity} target={targetFlow} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Floor Picked UPH & Pick Density */}
                <div className="xl:col-span-3 h-full flex flex-col gap-6">

                    {/* Floor Picked UPH */}
                    <div className="glass-panel metric-mesh-emerald rounded-xl p-6 relative overflow-visible group hover:border-emerald-500/40 transition-all duration-300 transform hover:-translate-y-1 flex-1 flex flex-col justify-center bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner shadow-emerald-500/5">
                                    <span className="material-symbols-outlined text-2xl">conveyor_belt</span>
                                </div>
                                <div>
                                    <p className="text-white text-base font-semibold">Floor Picked UPH</p>
                                </div>
                            </div>
                            {/* Tooltip */}
                            <div className="relative group/tooltip">
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                                <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs opacity-0 group-hover/tooltip:opacity-100 invisible group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none backdrop-blur-md">
                                    {METRIC_TOOLTIPS.FLOOR_UPH}
                                </div>
                            </div>
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
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-inner shadow-amber-500/5">
                                    <span className="material-symbols-outlined text-2xl">widgets</span>
                                </div>
                                <div>
                                    <p className="text-white text-base font-semibold">Pick Density</p>
                                </div>
                            </div>
                            {/* Tooltip */}
                            <div className="relative group/tooltip">
                                <span className="material-symbols-outlined text-slate-500 hover:text-white cursor-help text-sm">info</span>
                                <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs opacity-0 group-hover/tooltip:opacity-100 invisible group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none backdrop-blur-md">
                                    {METRIC_TOOLTIPS.OUTPUT_DENSITY}
                                </div>
                            </div>
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
                            step={1}
                            color="slate"
                        />

                        {/* 2. Pick Time */}
                        <TimelineNode
                            icon="shopping_cart"
                            label="Pick Time"
                            value={pickTimeStr}
                            step={2}
                            color="blue"
                            active
                        />

                        {/* 3. Travel */}
                        <TimelineNode
                            icon="local_shipping"
                            label="Travel"
                            value={travelTimeStr}
                            step={3}
                            color="slate"
                        />

                        {/* 4. Sort (If > 0) */}
                        <TimelineNode
                            icon="swap_horiz"
                            label="Sort"
                            value={sortTimeStr}
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
                            step={5}
                            color="pink"
                            active
                        />

                        {/* 6. Break */}
                        <TimelineNode
                            icon="free_breakfast"
                            label="Break"
                            value={breakTimeStr}
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

function TimelineNode({ icon, label, value, step, color, active, dimmed }: any) {
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
            </div>
        </div>
    );
}
