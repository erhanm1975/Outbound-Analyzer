import React from 'react';
import { MetricCard } from './velocity-guide';

export function FlowAuditGuide() {
    return (
        <div className="space-y-12 pb-16">
            {/* 1. Orientation Summary */}
            <div className="space-y-4">
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    The <strong>Flow Audit</strong> screen visualizes the rhythm of the building.
                </p>
                <p className="text-slate-400">
                    By bucketing raw task data into specific, configurable time intervals (e.g., every 30 minutes), this matrix exposes pacing drops, post-break shift fatigue, top performer consistency, and bottleneck heatmaps that are otherwise invisible in standard daily-average calculations.
                </p>
            </div>

            <hr className="border-slate-800" />

            {/* 2. Controls and Toggles */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">View Controls</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The Matrix is highly interactive. You must configure the three toggles at the top of the grid to slice the behavior appropriately.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">filter_alt</span>
                            Process Selector
                        </h4>
                        <p className="text-sm text-slate-300">
                            Switching between <strong>Picking</strong>, <strong>Sorting</strong>, or <strong>Packing</strong> instantly rebuilds the entire matrix using only the tasks mapped to that operational leg.
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">timer</span>
                            Interval Bucketing
                        </h4>
                        <p className="text-sm text-slate-300">
                            Change the temporal resolution (<strong>15m</strong>, <strong>30m</strong>, <strong>60m</strong>). Smaller intervals expose micro-stoppages. Larger intervals smooth the data for macro trend auditing.
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">bar_chart</span>
                            Metric Toggle
                        </h4>
                        <p className="text-sm text-slate-300">
                            <strong>Volume</strong> shows the physical number of distinct items moved. <strong>Tasks</strong> shows the number of system scans executed (exposing bulk verification vs single-piece handling).
                        </p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 3. Core Math (MetricCards) */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Flow Mathematics</h3>
                <div className="space-y-4 mb-6">
                    <p className="text-slate-400 max-w-4xl border-l-2 border-indigo-500 pl-4 bg-indigo-500/5 py-3">
                        The engine generates <strong>"Dynamic Flow UPH"</strong> instead of standard UPH to prevent a few dormant workers from dragging down the mathematical pace of the active shift.
                    </p>
                    <p className="text-slate-400 max-w-4xl">
                        By slicing the shift into micro-intervals (e.g., 30 minutes), the system mathematically evaluates <em>only</em> the intervals where each user was physically capturing volume — null (zero-activity) intervals are excluded from their average.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <MetricCard
                        title="Per-User Avg Flow UPH"
                        scope="Per Row (Per User)"
                        direction="Higher is Better"
                        color="indigo"
                        formula="((∑ Non-Null Interval Values) / Count of Non-Null Intervals) × (60 / Interval Mins)"
                        description="Calculates the hourly UPH for each individual user. Only intervals where the user had activity (non-null) are counted. The result is always projected to a full 60-minute hour regardless of the selected interval size."
                        example={{
                            scenario: "User A picks in 3 of 4 intervals (30-min each): 9AM → 10 units, 10AM → 20 units, 11AM → null, 12PM → 15 units.",
                            math: "Avg per interval: (10 + 20 + 15) / 3 = 15. Hourly: 15 × (60 / 30) = 30 UPH."
                        }}
                    />
                    <MetricCard
                        title="Shift Avg Flow UPH"
                        scope="Shift-Level (Top Metric)"
                        direction="Higher is Better"
                        color="blue"
                        formula="(∑ All Per-User Avg Flow UPH) / (Count of Users with ≥ 1 Active Interval)"
                        description="The shift-level average displayed at the top of the screen. It is the simple mean of all individual per-user hourly UPH values. Only users who had at least one active interval are included."
                        example={{
                            scenario: "3 active users have per-user Avg UPH of: User A = 30, User B = 45, User C = 25.",
                            math: "(30 + 45 + 25) / 3 = 33 Shift Avg UPH."
                        }}
                    />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <MetricCard
                        title="Avg Task Duration"
                        scope="Baseline Reference"
                        direction="Context Dependent"
                        color="slate"
                        formula="(∑ Productive Seconds for Process) / (∑ Total Scans for Process)"
                        description="The aggregate baseline reference for how long a single loop of work (Direct + Travel) takes. This establishes the absolute physical 'speed limit' foundation for the Flow UPH capacity model before breaks and gaps are introduced."
                        example={{
                            scenario: "Across the entire shift, there were 10,000 tasks that took 300,000 Productive Seconds to process.",
                            math: "(300,000 / 10,000) = 30 seconds per scan. (30s / 60) = 0.5 min Avg Task."
                        }}
                    />
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 4. Matrix Heatmap Reading */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <span className="material-symbols-outlined text-emerald-400">grid_on</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Reading the Matrix Heatmap</h3>
                </div>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The grid renders every physical user on the Y-Axis and every chronological interval on the X-Axis.
                    The cell color intensity (opacity of the Emerald green) corresponds directly to the volume/task count.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-emerald-500/80 border border-emerald-500"></div>
                            <span className="text-sm font-bold text-white">High Intensity (Solid Emerald)</span>
                        </div>
                        <p className="text-sm text-slate-400 pl-9">
                            Indicates a user hit the maximum threshold of output for that specific interval. Used to visually identify top performers and peak operational rush hours.
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 text-[10px] font-bold">·</div>
                            <span className="text-sm font-bold text-slate-400">Dormant (Empty Dot)</span>
                        </div>
                        <p className="text-sm text-slate-500 pl-9">
                            Indicates the user registered <strong>zero</strong> volume or tasks for this entire interval segment. A cluster of dormant dots usually indicates a break, a meeting, or moving to an untracked job code.
                        </p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 5. Diagnostic Takeaway */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                        <span className="material-symbols-outlined text-rose-400">query_stats</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Diagnostic: Why is Avg Flow UPH usually lower than Floor Picked UPH?</h3>
                </div>

                <p className="text-slate-400 mb-6 max-w-4xl border-l-2 border-rose-500 pl-4 bg-rose-500/5 py-3">
                    The difference comes down to <strong>what part of the timeline</strong> is used as the denominator in the math.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Floor Picked UPH */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Floor Picked UPH (Pure Mechanical Speed)
                        </h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><strong>What it measures:</strong> The pure, raw speed of the worker <em>while their hands are on the item</em>.</li>
                            <li><strong>The Math:</strong> Total Units Picked / Total Exact Task Duration (Timestamp of Final Scan - Timestamp of Arrival).</li>
                            <li><strong>Why it's highest:</strong> This metric completely ignores travel time, bathroom breaks, scanner latency, and time spent standing around between assignments. If a worker takes 10 minutes to walk across the warehouse, but only takes 5 seconds to grab the item from the bin, Floor Picked UPH only grades them on those 5 seconds.</li>
                        </ul>
                    </div>

                    {/* Avg Flow UPH */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Avg Flow UPH (Realistic Hourly Pace)
                        </h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><strong>What it measures:</strong> The realistic output rhythm of the shift over block intervals.</li>
                            <li><strong>The Math:</strong> It buckets the shift into intervals (e.g., 30-minute blocks). If a worker picks <em>anything</em> in that block, the engine considers them "active" and calculates their pace based on the full block.</li>
                            <li><strong>Why it's lower:</strong> Because the interval bucket inherently absorbs all of the "non-value add" time. It includes walking time, the scanner loading screen, and those 2-minute breathers they take in between picking aisles.</li>
                        </ul>
                    </div>
                </div>

                {/* The Takeaway Box */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-6 mt-6">
                    <h4 className="text-lg font-bold text-indigo-300 mb-2">The "Micro-Idle or Travel Problem"</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        If you notice that <strong>Floor Picked UPH is very high</strong>, but <strong>Avg Flow UPH is very low</strong>, you have diagnosed a major operational bottleneck. It means your workers are extremely fast mechanics—when they get to the bin, they pick the item flawlessly. However, they are bleeding massive amounts of time <em>between</em> tasks.
                    </p>
                    <p className="text-slate-400 text-sm mt-3 font-medium">This usually indicates:</p>
                    <ul className="list-disc list-inside text-slate-400 text-sm mt-2 space-y-1 ml-2">
                        <li><strong>Poor Batching/Density:</strong> They are walking too far for single items.</li>
                        <li><strong>Warehouse Layout:</strong> High-velocity goods are placed too far away from the packing stations.</li>
                        <li><strong>Micro-Breaks:</strong> Workers are standing in the aisles talking between scans, which drags down the Flow UPH but keeps their pure Floor task speed looking great.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
