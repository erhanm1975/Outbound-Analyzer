import React from 'react';
import { MetricCard } from './velocity-guide';

export function EmployeeGuide() {
    return (
        <div className="space-y-12 pb-16">
            {/* 1. Orientation Summary */}
            <div className="space-y-4">
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    The <strong>Employee Performance</strong> dashboard shifts the operational lens from systems down to the individual operator.
                </p>
                <p className="text-slate-400">
                    While the Velocity and Happy Path views measure the efficiency of your building's layout and waving logic, the Employee Performance view measures the pure physical execution of your staff against those constraints. It is designed to rapidly identify top-performers, isolate those needing additional coaching, and diagnose true utilization vs simple wall-clock time.
                </p>
            </div>

            <hr className="border-slate-800" />

            {/* 2. Highlights Section */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Highlights Section</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    Located at the top of the dashboard, the Highlights section bubbles up the most actionable operational extremes across the entire selected dataset.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400">trophy</span>
                            Top Performers (UPH)
                        </h4>
                        <p className="text-sm text-slate-400 mb-4">
                            Highlights the three operators with the highest Units Per Hour (UPH) occupancy.
                        </p>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li className="flex gap-2"><span className="text-indigo-400 font-bold">•</span> Ranked purely by Occupancy UPH.</li>
                            <li className="flex gap-2"><span className="text-indigo-400 font-bold">•</span> Displays their total absolute volume against their total wall-clock shift span.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-lg font-bold text-rose-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-500">trending_down</span>
                            Needs Attention
                        </h4>
                        <p className="text-sm text-slate-400 mb-4">
                            Highlights the bottom three operators by UPH, providing a discrete target list for floor supervisors to check in on.
                        </p>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span> Only ranks operators who have clocked distinct actions in the dataset.</li>
                            <li className="flex gap-2"><span className="text-rose-400 font-bold">•</span> Useful for distinguishing system issues (everybody is slow) from individual friction.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 3. The Details Grid Columns */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">All User Metrics Grid</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The lower half of the dashboard is an intensely sortable, full-roster breakdown of every unique worker ID found in the dataset. Understanding these custom calculated columns is critical for accurate coaching.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <MetricCard
                        title="Volume"
                        scope="Absolute Count"
                        direction="Higher is Better"
                        formula="∑ (Valid System Scans)"
                        description="Total distinct task pieces or units the worker logged across the entire dataset."
                        example={{
                            scenario: "Worker A picks 800 items and then puts away 200 items.",
                            math: "800 + 200 = 1,000 distinct volume units."
                        }}
                    />
                    <MetricCard
                        title="Span (Hrs)"
                        scope="Wall Clock Time"
                        direction="Context Dependent"
                        color="indigo"
                        formula="Last Scan Timestamp - First Scan Timestamp"
                        description="The absolute chronological boundary of their day. It does not subtract breaks, lunches, or meetings."
                        example={{
                            scenario: "Worker B's first scan is at 08:00 AM and last scan is at 04:30 PM.",
                            math: "16:30 - 08:00 = 8.5 Hours Total Span."
                        }}
                    />
                    <MetricCard
                        title="Active (Hrs)"
                        scope="Filtered Context"
                        direction="Higher is Better"
                        color="violet"
                        formula="Span (Hrs) - ∑ (Gaps > Break Threshold)"
                        description="Total span minus any inactive gaps that exceeded the configured break threshold. This is the true 'Time on Task'."
                        example={{
                            scenario: "Worker C has an 8.5 Hour Span, but the system detects a 45-minute undocumented gap between two scans.",
                            math: "8.5 Hrs - 0.75 Hrs = 7.75 Hours Active."
                        }}
                    />
                </div>

                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined">speed</span>
                        Understanding UPH vs Utilization
                    </h4>
                    <div className="space-y-6">
                        <div className="border-l-4 border-slate-700 pl-4 py-1">
                            <h5 className="font-bold text-white mb-1">UPH (Occupancy)</h5>
                            <p className="text-sm text-slate-400 mb-2">
                                <strong>Formula:</strong> <code>Total Volume / Span (Hrs)</code>
                            </p>
                            <p className="text-sm text-slate-300">
                                This is the harshest, truest metric. It takes their total production and divides it by the total time they were literally in the building (from first to last scan). If they took a 1-hour undocumented nap, their UPH absorbs that hit directly.
                            </p>
                        </div>

                        <div className="border-l-4 border-emerald-700 pl-4 py-1">
                            <h5 className="font-bold text-white mb-1">Utilization %</h5>
                            <p className="text-sm text-slate-400 mb-2">
                                <strong>Formula:</strong> <code>Active (Hrs) / Span (Hrs)</code>
                            </p>
                            <p className="text-sm text-slate-300">
                                The percentage of their day they spent actively engaging the system. <br />
                                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1 mt-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Green ({'>'}85%):</span> Standard acceptable active rate.<br />
                                <span className="text-rose-400 font-semibold inline-flex items-center gap-1 mt-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Red ({'<'}50%):</span> Significant portions of the day were spent detached from standard work loops.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Actionable Insights */}
            <div className="space-y-6">
                <hr className="border-slate-800 my-8" />
                <h3 className="text-xl font-semibold text-white mb-4">Diagnostics & Insights</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    How to use the Worker Metrics to diagnose conflicting floor scenarios.
                </p>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-rose-500/20 shadow-none border-l-4 border-l-rose-500 transition-colors">
                        <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-rose-400">search_hands_free</span>
                            The "Phantom Worker" (High Active, Low UPH)
                        </h4>
                        <p className="text-sm text-slate-400 mb-4 bg-slate-950 p-3 rounded">
                            User shows 90% utilization but very poor UPH. Their system scans are tightly clustered (meaning they rarely gap above the Break Threshold), but they are taking extremely long per unit. This typically indicates a lack of training on system operation, struggling with equipment, or intentional slow-walking.
                        </p>
                        <div className="flex items-center gap-4 text-xs font-mono bg-slate-800/50 w-fit p-2 rounded">
                            <div className="flex flex-col"><span className="text-emerald-400 font-bold">92%</span><span className="text-emerald-500/70">Util</span></div>
                            <div className="w-px h-6 bg-slate-700"></div>
                            <div className="flex flex-col"><span className="text-rose-400 font-bold">45</span><span className="text-rose-500/70">UPH</span></div>
                            <div className="w-px h-6 bg-slate-700"></div>
                            <div className="flex flex-col"><span className="text-slate-300 font-bold">8.2 Hrs</span><span className="text-slate-500">Span</span></div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-xl border border-amber-500/20 shadow-none border-l-4 border-l-amber-500 transition-colors">
                        <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-amber-400">person_run</span>
                            The "Sprinter" (Low Util, Average UPH)
                        </h4>
                        <p className="text-sm text-slate-400 mb-4 bg-slate-950 p-3 rounded">
                            User is capable of working extremely fast when active, but sustains massive breaks across their day. Because they pick at such high speeds when working, their total daily UPH looks 'acceptable' based on volume, but their Utilization flag turns red. This is the hardest friction to notice without this dual-metric array.
                        </p>
                        <div className="flex items-center gap-4 text-xs font-mono bg-slate-800/50 w-fit p-2 rounded">
                            <div className="flex flex-col"><span className="text-rose-400 font-bold">42%</span><span className="text-rose-500/70">Util</span></div>
                            <div className="w-px h-6 bg-slate-700"></div>
                            <div className="flex flex-col"><span className="text-slate-300 font-bold">110</span><span className="text-slate-500/70">UPH</span></div>
                            <div className="w-px h-6 bg-slate-700"></div>
                            <div className="flex flex-col"><span className="text-slate-300 font-bold">950</span><span className="text-slate-500">Volume</span></div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
