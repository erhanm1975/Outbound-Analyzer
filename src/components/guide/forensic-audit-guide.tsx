import React from 'react';
import { MetricCard } from './velocity-guide';

export function ForensicAuditGuide() {
    return (
        <div className="space-y-12 pb-16">
            {/* 1. Orientation Summary */}
            <div className="space-y-4">
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    The <strong>Forensic Audit</strong> (Warehouse Logic View) is the deepest analytical layer available in Antigravity OS.
                </p>
                <p className="text-slate-400">
                    Unlike the Timeline Audit which simply logs raw chrono-events, this screen exposes the calculation engine's internal memory map. It reveals exactly how the engine ingested pure WMS string data, applied friction heuristics (like implicit travel and break thresholds), and converted them into fully weaponized <code>TaskObjects</code> and <code>ActivityObjects</code> with mapped durations.
                </p>
            </div>

            <hr className="border-slate-800" />

            {/* 2. Tasks vs Activities */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Object Toggle Modes</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The calculation engine structure is strictly hierarchical. You must select which specific object hierarchy you wish to audit using the blue/indigo toggle at the top of the grid.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-blue-500/20 border-t-4 border-t-blue-500">
                        <h4 className="text-lg font-bold text-blue-300 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-blue-400">receipt_long</span>
                            Task Objects (Atomic)
                        </h4>
                        <p className="text-sm text-slate-300 mb-3">
                            A Task Object is a single, atomic interaction between the user and the system. It represents the smallest definable action (e.g., scanning a single LPN to a single bin).
                        </p>
                        <p className="text-sm text-slate-400 font-mono bg-slate-950 p-2 rounded">
                            Hierarchy: 1 Scan = 1 Task Object
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-5 rounded-xl border border-indigo-500/20 border-t-4 border-t-indigo-500">
                        <h4 className="text-lg font-bold text-indigo-300 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-indigo-400">layers</span>
                            Activity Objects (Aggregated)
                        </h4>
                        <p className="text-sm text-slate-300 mb-3">
                            An Activity Object is a contiguous run of work on the exact same `JobCode`. The engine automatically "rolls up" hundreds of identical, sequential Task Objects into a single Activity Object.
                        </p>
                        <p className="text-sm text-slate-400 font-mono bg-slate-950 p-2 rounded">
                            Hierarchy: N Tasks on Job X = 1 Activity Object
                        </p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 3. Duration Breakdowns */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Atomic Duration Math</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The engine's primary purpose is to take the gross `netGap` time between two events and categorize that time into distinct physical behaviors. Here is exactly how seconds are attributed.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard
                        title="Direct (s)"
                        scope="Task Processing"
                        direction="Context Dependent"
                        color="blue"
                        formula="Fixed Engine Lookup"
                        description="The system assumes a fixed number of standard seconds to 'process' a specific task type."
                        example={{
                            scenario: "The master config allows '6 seconds' to process a standard LPN pick.",
                            math: "Direct = 6s"
                        }}
                    />
                    <MetricCard
                        title="Travel (s)"
                        scope="Spatial Navigation"
                        direction="Lower is Better"
                        color="amber"
                        formula="Remaining Gap <= Threshold"
                        description="Any remaining time left over from the Gap AFTER Direct time is deducted, as long as it does not exceed the Break Threshold."
                        example={{
                            scenario: "Gap is 20s. Direct takes 6s. The gap is less than the 300s (5m) threshold.",
                            math: "20s Gap - 6s Direct = 14s Travel."
                        }}
                    />
                    <MetricCard
                        title="Prod (s)"
                        scope="Total Output"
                        direction="Higher is Better"
                        color="emerald"
                        formula="∑ (Direct + Travel)"
                        description="The total time the engine credits toward actual, physical work on the floor."
                        example={{
                            scenario: "A user spent 6s processing and 14s walking to the location.",
                            math: "6s + 14s = 20s Productive Duration."
                        }}
                    />
                    <MetricCard
                        title="Unprod (s)"
                        scope="Friction / Breaks"
                        direction="Lower is Better"
                        color="rose"
                        formula="Gap >= Break Threshold"
                        description="If the Gap exceeds the defined maximum threshold, ZERO travel is awarded, and the ENTIRE gap is classified as wasted."
                        example={{
                            scenario: "User's gap between scans was 405s (6m 45s). The Threshold is 300s (5m).",
                            math: "405 > 300 = 405s Unproductive Duration. 0s Travel attributed."
                        }}
                    />
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 4. Task Objects Dictionary */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <span className="material-symbols-outlined text-blue-400">receipt_long</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Task Object Dictionary</h3>
                </div>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    When auditing the system at the atomic log level, each row represents a strictly defined physical action.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Identification</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">User:</strong><span>The employee ID assigned to the execution device.</span></li>
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">Job Code:</strong><span>The financial bucket tracking this labor (e.g., INB, PICK, SORT).</span></li>
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">Order ID:</strong><span>The unique identifier mapping to a customer's shipment constraint.</span></li>
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">SKU:</strong><span>The uniquely tracked item identifier being manipulated.</span></li>
                        </ul>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Execution Geometry</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">Type:</strong><span>Physical label (e.g. `LPN_PICK`) or an engine-injected label (`Break`).</span></li>
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">Location:</strong><span>The topological coordinate inside the building (e.g., `A-12-04`).</span></li>
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">Zone:</strong><span>The logical geographic boundary (e.g., `MEZZANINE`, `RESERVE`).</span></li>
                            <li className="flex gap-2 text-slate-400"><strong className="text-slate-300 min-w-20">Qty:</strong><span>The physical volume moved in this exact micro-transaction.</span></li>
                        </ul>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 5. Activity Objects Dictionary */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <span className="material-symbols-outlined text-indigo-400">layers</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Activity Object Rollups</h3>
                </div>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    When the toggle is switched to Activity Objects, the system executes an aggregation pass.
                    Contiguous Task Objects for the identical User and Job Code are compressed into a single block, as long as they are not interrupted by a break or job change.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <MetricCard
                        title="Boundary Logic"
                        scope="Start / Finish"
                        direction="Context Dependent"
                        color="indigo"
                        formula="Min(Start) → Max(Finish)"
                        description="The system anchors the Activity using the start time of the first scan in the sequence, and the finish time of the absolute last scan."
                        example={{
                            scenario: "User picks 30 times between 8:00 AM and 8:30 AM without changing tasks.",
                            math: "Rollup Start = 8:00 AM | Rollup Finish = 8:30 AM"
                        }}
                    />
                    <MetricCard
                        title="Aggregated Math"
                        scope="Tasks, Orders, Units"
                        direction="Higher is Better"
                        color="violet"
                        formula="∑ (Values in Block)"
                        description="The total counts are simply summed across every individual Task Object trapped inside the Activity window."
                        example={{
                            scenario: "A 30-minute picking activity involved 40 location stops and picked 120 total units.",
                            math: "Tasks = 40 | Units = 120"
                        }}
                    />
                    <MetricCard
                        title="Duration Rollups"
                        scope="Prod / Unprod"
                        direction="Context Dependent"
                        color="indigo"
                        formula="∑ (Durations in Block)"
                        description="The exact atomic durations calculated above are grouped. (e.g., Productive is the sum of every Direct + Travel second in the block)."
                        example={{
                            scenario: "Across 40 picks, there were 900s of Travel and 600s of Direct processing.",
                            math: "Activity Productive Time = 1,500s"
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
