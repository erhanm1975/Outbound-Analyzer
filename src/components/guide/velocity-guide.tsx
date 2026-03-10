import React, { useEffect } from 'react';

export interface VelocityGuideProps {
    scrollToId?: string;
}

export function VelocityGuide({ scrollToId }: VelocityGuideProps = {}) {
    useEffect(() => {
        if (scrollToId) {
            setTimeout(() => {
                const el = document.getElementById(scrollToId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-4', 'ring-offset-slate-950', 'transition-all', 'duration-500');
                    setTimeout(() => {
                        el.classList.remove('ring-2', 'ring-cyan-500', 'ring-offset-4', 'ring-offset-slate-950');
                    }, 2500);
                }
            }, 350); // wait for drawer slide-in
        }
    }, [scrollToId]);

    return (
        <div className="space-y-10 pb-8 text-slate-100">

            {/* 1. Summary Section */}
            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white tracking-tight">Velocity Dashboard Overview</h2>
                <div className="prose prose-invert max-w-none">
                    <p className="text-sm text-slate-300 leading-relaxed">
                        The <strong>Velocity Dashboard</strong> is the primary specialized view for analyzing warehouse throughput speed and flow efficiency.
                        It focuses on high-level "Speed Limit" metrics to understand how fast the facility is moving and identifies bottlenecks in the chronological task flow (Pick &rarr; Pack).
                    </p>
                    <p className="text-slate-400 text-sm">
                        Use this guide to understand exactly how each metric is calculated, whether a higher or lower number is better, and how to use them together to diagnose operational failures.
                    </p>
                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 2. Primary Metrics (Top 4 Boxes) */}
            <section className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-xl">menu_book</span>
                    Primary Speed Metrics
                </h2>

                <div className="grid grid-cols-1 gap-8">

                    {/* Pick Flow Velocity */}
                    <MetricCard
                        id="pick-flow-velocity"
                        title="Pick Flow Velocity"
                        color="cyan"
                        direction="Higher is Better"
                        scope="Average UPH per Picker (Facility-Wide Aggregate)"
                        formula="Total Units Picked / Sum(Individual Worker Shift Spans)"
                        description="The ultimate 'ROI' metric. It tells you exactly how much output you got for every hour a worker was physically in the building."
                        example={{
                            scenario: "A facility has 10 workers. Each worker's time between their very first scan of the day and their very last scan is exactly 8 hours (80 hours total labor footprint). They collectively pick 8,000 units.",
                            math: "8,000 units / 80 hours = 100 UPH"
                        }}
                        note="Worker Shift Span is the absolute elapsed time between a user's First Scan and Last Scan that day."
                    />

                    {/* Pick Flow Velocity — Timeline Visual */}
                    <ShiftTimelineVisual
                        title="Pick Flow Velocity uses the ENTIRE shift span — everything counts."
                        metricLabel="Pick Flow Velocity"
                        accentColor="border-cyan-500/20"
                        segments={[
                            { label: 'Pick', width: 'w-[20%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[10%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[15%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Lunch', width: 'w-[12%]', color: 'bg-rose-600', textColor: 'text-white' },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[18%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[5%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                        ]}
                        includedLabel="All segments — Active Picks, Travel, Breaks, Idle (entire First Scan → Last Scan span)"
                        excludedLabel="Nothing. Every second between First Scan and Last Scan is counted."
                        note="This is why Pick Flow Velocity is always the lowest UPH number — it penalizes breaks, idle time, and travel equally. It represents the raw ROI of a worker's presence."
                    />

                    {/* Active Wall Clock Time */}
                    <MetricCard
                        id="active-wall-clock-time"
                        title="Active Wall Clock Time"
                        color="indigo"
                        direction="N/A (Time Measurement)"
                        scope="Worker Duration Calculation"
                        formula="Worker Shift Span - Sum(Breaks & Lunch > BreakThreshold)"
                        description="This is the core foundational measurement of how long a worker was actually 'on the clock' and available to work, excluding any long, detectable periods of inactivity."
                        example={{
                            scenario: "A worker is in the building for 8 hours between their first and last scan. They take a 30-minute lunch and two 15-minute breaks. The engine strips out that 1 hour of downtime.",
                            math: "8 hours shift span - 1 hour breaks = 7 hours Active Wall Clock Time"
                        }}
                        note="The BreakThreshold is typically set to 5 minutes. Any gap between scans strictly greater than 5 minutes is considered a 'Break' and removed."
                    />

                    <ShiftTimelineVisual
                        title="Active Wall Clock Time only includes the 'Bright' segments."
                        metricLabel="Active Wall Clock Time"
                        accentColor="border-indigo-500/20"
                        segments={[
                            { label: 'Pick', width: 'w-[20%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[10%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[15%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Lunch', width: 'w-[12%]', color: 'bg-rose-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[18%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[5%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                        ]}
                        includedLabel="Active Picks, Travel, and Short 'Micro-Idle' gaps (< BreakThreshold)"
                        excludedLabel="Detected Breaks & Lunch (> BreakThreshold)"
                        note="Active Wall Clock Time is the fundamental denominator used by both Productive UPH and Efficiency Score. It is composed entirely of the non-striped segments stitched together."
                    />

                    {/* Productive Picked UPH */}
                    <MetricCard
                        id="productive-picked-uph"
                        title="Productive Picked UPH"
                        color="blue"
                        direction="Higher is Better"
                        scope="Average UPH per Picker (Excluding Breaks)"
                        formula="Total Units Picked / Sum(Active Wall Clock Time)"
                        description="This shows the true mechanical speed of the team when they are actively working. It strips out known breaks, lunches, and long gaps."
                        example={{
                            scenario: "Taking the same 10 workers (80 hours total footprint). The engine detects that each worker took a 30-minute lunch and two 15-minute breaks (1 hour of downtime per worker, stripping 10 hours out total). The 'Active Wall Clock Time' is 70 hours.",
                            math: "8,000 units / 70 active hours = 114 UPH"
                        }}
                    />

                    {/* Productive UPH — Timeline Visual */}
                    <ShiftTimelineVisual
                        title="Productive UPH strips out detected breaks — only 'active' time counts."
                        metricLabel="Productive Picked UPH"
                        accentColor="border-blue-500/20"
                        segments={[
                            { label: 'Pick', width: 'w-[20%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[10%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[15%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Lunch', width: 'w-[12%]', color: 'bg-rose-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[18%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[5%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                        ]}
                        includedLabel="Active Picks, Travel, and Micro-Idle (gaps under 5 min)"
                        excludedLabel="Detected Breaks & Lunch (gaps > BreakThreshold, typically 5 minutes)"
                        note="By excluding breaks, Productive UPH is always higher than Pick Flow Velocity. The gap between them reveals how much time the team loses to breaks."
                    />

                    {/* Efficiency Score */}
                    <MetricCard
                        id="efficiency-score-utilization"
                        title="Efficiency Score (Utilization)"
                        color="cyan"
                        direction="Higher is Better (Target: ~80-85%)"
                        scope="Facility-Wide Utilization Percentage"
                        formula="(Sum(Active Wall Clock Time) / Sum(Worker Shift Spans)) * 100"
                        description="Measures what percentage of a worker's shift was spent actively scanning versus taking breaks or suffering from idle downtime."
                        example={{
                            scenario: "A single worker's first scan is at 08:00 and last is at 16:00 (8 Hour Span). The system detects a 1-hour gap at noon with no scans (e.g., lunch + break). The Active Wall Clock Time is 7 hours.",
                            math: "(7 active hours / 8 footprint hours) * 100 = 87.5% Efficiency"
                        }}
                        note="Active Wall Clock is calculated by subtracting any gap between consecutive scans that exceeds the configured BreakThreshold (usually 5 minutes)."
                    />

                    {/* Efficiency Score — Timeline Visual */}
                    <ShiftTimelineVisual
                        title="Efficiency Score compares 'Active Time' against the entire Shift Span."
                        metricLabel="Efficiency Score"
                        accentColor="border-cyan-500/20"
                        segments={[
                            { label: 'Pick', width: 'w-[20%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[10%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[15%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Lunch', width: 'w-[12%]', color: 'bg-rose-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[18%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[5%]', color: 'bg-amber-600', textColor: 'text-white' },
                            { label: 'Pick', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                        ]}
                        includedLabel="Active Time (Numerator): Active Picks, Travel, and Micro-Idle"
                        excludedLabel="Inactive Time (Penalizes Efficiency): Detected Breaks & Lunch"
                        note="The entire 8-hour progress bar represents the Denominator (Shift Span). The filled segments represent your Numerator (Active Time). Efficiency is simply Filled Time / Entire Bar."
                    />

                    {/* Floor Picked UPH */}
                    <MetricCard
                        id="floor-picked-uph"
                        title="Floor Picked UPH"
                        color="emerald"
                        direction="Higher is Better"
                        scope="Pure Mechanical Task Speed per Picker"
                        formula="Total Units Picked / Total Task Footprint"
                        description="Evaluates the speed *during* the tasks themselves. It ignores both macro-breaks AND any micro-idle time spent standing around between tasks."
                        example={{
                            scenario: "A worker picks 100 units. If we extract the exact start-to-finish duration of those 100 specific pick tasks, it equals 30 minutes of actual mechanical execution. Even if the worker took 4 hours to finish the day...",
                            math: "100 units / 0.5 hours actual execution = 200 UPH"
                        }}
                        note="Total Task Footprint is strictly the sum of the duration of individual valid task rows."
                    />

                    {/* Floor UPH — Timeline Visual */}
                    <ShiftTimelineVisual
                        title="Floor Picked UPH only counts time INSIDE actual tasks — the purest speed metric."
                        metricLabel="Floor Picked UPH"
                        accentColor="border-emerald-500/20"
                        segments={[
                            { label: 'Pick', width: 'w-[20%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[10%]', color: 'bg-amber-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Pick', width: 'w-[15%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Lunch', width: 'w-[12%]', color: 'bg-rose-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Idle', width: 'w-[5%]', color: 'bg-slate-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Pick', width: 'w-[18%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Travel', width: 'w-[5%]', color: 'bg-amber-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Pick', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                        ]}
                        includedLabel="Only the Pick Execution segments (actual task start → finish time)"
                        excludedLabel="Travel, Breaks, Lunch, and all Idle time between tasks"
                        note="Floor UPH is always the highest number because it measures pure mechanical execution speed. If this is low, the workers themselves are slow — not the process."
                    />

                    {/* Pick Density */}
                    <MetricCard
                        id="pick-density"
                        title="Pick Density"
                        color="amber"
                        direction="Higher is Better"
                        scope="Average Units per Location Stop"
                        formula="Total Units / Total Tasks (Unique locations visited)"
                        description="A high facility density (e.g., > 2.5) dramatically increases UPH without requiring extra walking effort, indicating effective batching."
                        example={{
                            scenario: "If a worker stops at a bin and picks 4 identical toothpaste tubes, the density for that stop is 4.0. If they walk to the next aisle and pick 1 laptop, the density is 1.0.",
                            math: ""
                        }}
                    />

                    {/* Facility Output by Process */}
                    <MetricCard
                        id="facility-output-process"
                        title="Facility Output by Process (Volume)"
                        color="blue"
                        direction="Higher is Better"
                        scope="Aggregate Facility Throughput per Hour"
                        formula="Sum(Units Processed) within strict 60-minute wall-clock intervals"
                        description="Visualizes the absolute number of units processed per hour. The forensic engine synchronizes all timestamped tasks across Pick, Sort, and Pack phases into strict, aligned 60-minute buckets to show the actual facility rhythm, regardless of staggered shift start times."
                        example={{
                            scenario: "If picking activity spans from 08:15 AM to 09:45 AM yielding 500 units, the engine strictly deposits the volume into the 08:00 AM bar (e.g., 300 units) and the 09:00 AM bar (e.g., 200 units).",
                            math: ""
                        }}
                    />

                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 3. Task Performance Breakdown (Timeline) */}
            <section className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500 text-xl">timeline</span>
                    Task Performance Breakdown
                </h2>
                <p className="text-slate-400 text-sm">
                    The horizontal timeline physically dissects the lifecycle of an average task into distinct chronological time buckets. By analyzing these buckets, you can see exactly <em>where</em> time is being lost on the floor.
                </p>
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 mb-4 inline-block">
                    <p className="text-sm font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">trending_down</span>
                        Direction: Lower is Better (For all segments)
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Inter-Job */}
                    <TimelineCard
                        title="Inter-Job (System Latency & Idle)"
                        icon="schedule"
                        color="slate"
                        definition="The 'dead time' between finishing one task and beginning the next."
                        formula="Timestamp of Next Task Request - Timestamp of Previous Task Completion"
                        example="Worker scans the final barcode of pick A at 10:00:00. They don't receive the prompt for pick B until 10:00:15. The Inter-Job time is 15 seconds."
                        diagnosticUse="If this is high (> 10s), it usually indicates WMS server latency, poor Wi-Fi dead zones, or workers intentionally lingering before requesting their next job."
                    />

                    {/* Travel */}
                    <TimelineCard
                        title="Travel Time (Non-Value Add)"
                        icon="local_shipping"
                        color="amber"
                        definition="The physical walking time required to move from the previous location to the current pick location."
                        formula="Calculated heuristically using P10 coordinate math between Start Bin and End Bin."
                        example="Worker finishes a pick in Aisle 1 and must walk to Aisle 15. The system calculates the walking distance based on warehouse coordinates."
                        diagnosticUse="If Travel Time dominates the timeline, your Pick Density is too low. The batching logic is failing, or the facility layout is highly unoptimized (e.g., fast-moving goods placed at the back)."
                    />

                    {/* Pick Time */}
                    <TimelineCard
                        title="Pick Execution (Value Add)"
                        icon="shopping_cart"
                        color="blue"
                        definition="The time spent physically retrieving the item(s) from the bin and scanning confirming barcodes."
                        formula="Timestamp of Final Scan - Timestamp of Arrival at Location"
                        example="Worker arrives at bin and scans location barcode. They then search for the item, grab it, and scan the UPC. This took 8 seconds."
                        diagnosticUse="If Pick Time is unusually high, the bins are likely messy (hard to find items), or the items are oversized/heavy and require special handling equipment (like a forklift)."
                    />

                    {/* Sort */}
                    <TimelineCard
                        title="Sort Time (Value Add)"
                        icon="swap_vert"
                        color="amber"
                        definition="The time spent sorting picked items into their designated order totes, lanes, or staging areas after the pick is complete."
                        formula="Timestamp of Sort Confirmation - Timestamp of Sort Initiation"
                        example="After picking 5 items for different orders, the worker walks to the sort wall and places each item into the correct order tote. Scanning each tote takes an average of 6 seconds per item."
                        diagnosticUse="If Sort Time is high, the sort wall may be too far from the pick zone, the labeling on totes may be confusing, or the worker-to-tote ratio is too high causing congestion at the sort station."
                    />

                    {/* Pack */}
                    <TimelineCard
                        title="Pack Time (Value Add)"
                        icon="inventory_2"
                        color="blue"
                        definition="The time spent packing sorted items into shipping containers, applying labels, and preparing for outbound shipment."
                        formula="Timestamp of Pack Complete Scan - Timestamp of Pack Start Scan"
                        example="Worker scans an order tote, selects the correct box size, places items inside, adds dunnage, seals the box, and scans the shipping label. Total time: 45 seconds."
                        diagnosticUse="If Pack Time is high, look at box selection complexity (too many SKU sizes), dunnage application steps, or printer delays for shipping labels. Standardizing box sizes can dramatically reduce this."
                    />
                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 4. Insights & Diagnostics */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-3xl">lightbulb</span>
                    Insights & Diagnostics
                </h2>
                <p className="text-slate-400 text-lg">
                    By cross-referencing these velocity metrics, you can diagnose the exact root cause of operational failures.
                </p>

                <div className="grid md:grid-cols-2 gap-6">

                    {/* The Ideal State */}
                    <div className="col-span-1 md:col-span-2 bg-emerald-900/10 border border-emerald-500/20 p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
                            <h3 className="text-xl font-bold text-emerald-400">The "Ideal" State (Perfect Flow)</h3>
                        </div>
                        <p className="text-slate-300 mb-4">
                            <strong>What it looks like:</strong> <code>Pick Flow Velocity</code> is very close to <code>Productive UPH</code>, which is very close to <code>Floor Picked UPH</code>. <code>Efficiency Score</code> is ~85%.
                        </p>
                        <p className="text-slate-400 text-sm">
                            <strong>Meaning:</strong> The team is working steadily. They aren't taking hidden breaks (meaning Productive ≈ Flow Velocity), and they aren't wasting time standing around between tasks (meaning Floor ≈ Productive).
                        </p>
                    </div>

                    {/* Scenario A */}
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <h3 className="text-lg font-bold text-white mb-2">Scenario A: The "Slow & Steady" Problem</h3>
                        <p className="text-slate-300 mb-4 text-sm">
                            <strong>Symptoms:</strong> Efficiency &gt; 90%, but Floor UPH is very low.
                        </p>
                        <p className="text-slate-400 text-sm">
                            <strong>Diagnosis:</strong> Workers are constantly scanning (never triggering the 5-minute break rule), but they are <em>physically moving very slowly</em>. They might be improperly trained, struggling with a bad UI on the scanner, or dealing with heavy/awkward items. They are "working", just not effectively.
                        </p>
                    </div>

                    {/* Scenario B */}
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <h3 className="text-lg font-bold text-white mb-2">Scenario B: The "Hidden Break" Problem</h3>
                        <p className="text-slate-300 mb-4 text-sm">
                            <strong>Symptoms:</strong> Productive UPH (150) is massively higher than Pick Flow Velocity (90). Efficiency Score is low (e.g., 60%).
                        </p>
                        <p className="text-slate-400 text-sm">
                            <strong>Diagnosis:</strong> When the team works, they are fast. But they are taking massive amounts of un-tracked downtime (long lunches, arriving late, quitting early, or assigned to non-tracking roles). You have an <em>attendance/management</em> problem, not a mechanical speed problem.
                        </p>
                    </div>

                    {/* Scenario C */}
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <h3 className="text-lg font-bold text-white mb-2">Scenario C: The "Micro-Idle" Problem</h3>
                        <p className="text-slate-300 mb-4 text-sm">
                            <strong>Symptoms:</strong> Floor Picked UPH (300) is massively higher than Productive UPH (120).
                        </p>
                        <p className="text-slate-400 text-sm">
                            <strong>Diagnosis:</strong> Workers pick extremely fast while at the bin. However, they waste massive amounts of time <em>between</em> tasks without ever triggering a hard 5-minute break. They are walking too slowly, talking in the aisles, or dealing with massive warehouse congestion. You have a <em>flow/layout</em> problem.
                        </p>
                    </div>

                    {/* Scenario D */}
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <h3 className="text-lg font-bold text-white mb-2">Scenario D: The "Density" Problem</h3>
                        <p className="text-slate-300 mb-4 text-sm">
                            <strong>Symptoms:</strong> Good speed metrics across the board, but Output volume targets are still missed.
                        </p>
                        <p className="text-slate-400 text-sm">
                            <strong>Diagnosis:</strong> Check <code>Pick Density</code>. If Density is 1.0 (single picks), the workers are walking the entire warehouse for every single unit. Even if they run, they can't hit the target. The WMS grouping logic (batching/wave planning) needs to be fixed.
                        </p>
                    </div>

                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 5. Diagnostic Takeaway: Flow vs Floor */}
            <section className="space-y-8">
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
            </section>

        </div>
    );
}

// --- Internal Reusable Card ---

export interface MetricCardProps {
    id?: string; // Added id prop
    title: string;
    color: 'cyan' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'violet' | 'rose' | 'slate' | 'purple'; // Kept original color types
    direction: string;
    scope: string;
    formula: string;
    description: string;
    example?: { scenario: string; math?: string }; // Changed math to optional as per original
    note?: string;
}

export function MetricCard({ id, title, color, direction, scope, formula, description, example, note }: MetricCardProps) { // Added id to props

    const colorMap = {
        cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/10',
        blue: 'text-blue-400 border-blue-500/30 bg-blue-950/10',
        emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/10',
        amber: 'text-amber-400 border-amber-500/30 bg-amber-950/10',
        indigo: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/10',
        violet: 'text-violet-400 border-violet-500/30 bg-violet-950/10',
        rose: 'text-rose-400 border-rose-500/30 bg-rose-950/10',
        slate: 'text-slate-400 border-slate-500/30 bg-slate-950/10',
        purple: 'text-purple-400 border-purple-500/30 bg-purple-950/10'
    };

    const theme = colorMap[color];

    return (
        <div id={id} className={`rounded-xl border p-5 shadow-md ${theme} relative`}> {/* Added id={id} */}
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-base font-black tracking-tight">{title}</h3>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] font-semibold uppercase tracking-widest text-slate-300">
                        Scope: {scope}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">trending_up</span>
                        {direction}
                    </span>
                </div>
            </div>

            <p className="text-slate-300 text-sm mb-5 max-w-3xl leading-relaxed">
                {description}
            </p>

            {/* Formula Block */}
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4 font-mono text-xs relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700"></div>
                <p className="text-slate-500 mb-1 uppercase text-[10px] tracking-wider">Exact Formula</p>
                <p className="text-white font-bold text-sm break-words">{formula}</p>
                {note && (
                    <p className="text-slate-400 mt-2 text-[10px] italic">{note}</p>
                )}
            </div>

            {/* Example Block (Optional) */}
            {example && (
                <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-800/50">
                    <p className="text-slate-500 mb-1.5 uppercase text-[10px] tracking-wider font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs">calculate</span>
                        Real-World Example
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                        {example.scenario}
                    </p>
                    {example.math && (
                        <div className="bg-black/40 py-1.5 px-3 rounded font-mono text-emerald-400 text-xs inline-block border border-slate-800">
                            {example.math}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

// --- Internal Reusable Timeline Item ---

export interface TimelineCardProps {
    title: string;
    icon: string;
    color: 'slate' | 'amber' | 'blue' | 'rose' | 'emerald' | 'cyan' | 'indigo' | 'violet' | 'purple';
    definition: string;
    formula: string;
    example: string;
    diagnosticUse: string;
}

export function TimelineCard({ title, icon, color, definition, formula, example, diagnosticUse }: TimelineCardProps) {
    const colorMap = {
        slate: 'border-slate-700 bg-slate-900/50',
        amber: 'border-amber-500/30 bg-amber-950/10',
        blue: 'border-blue-500/30 bg-blue-950/10',
        rose: 'border-rose-500/30 bg-rose-950/10',
        emerald: 'border-emerald-500/30 bg-emerald-950/10',
        cyan: 'border-cyan-500/30 bg-cyan-950/10',
        indigo: 'border-indigo-500/30 bg-indigo-950/10',
        violet: 'border-violet-500/30 bg-violet-950/10',
        purple: 'border-purple-500/30 bg-purple-950/10'
    };

    const iconColorMap = {
        slate: 'text-slate-400',
        amber: 'text-amber-400',
        blue: 'text-blue-400',
        rose: 'text-rose-400',
        emerald: 'text-emerald-400',
        cyan: 'text-cyan-400',
        indigo: 'text-indigo-400',
        violet: 'text-violet-400',
        purple: 'text-purple-400'
    };

    const theme = colorMap[color];
    const iconTheme = iconColorMap[color];

    return (
        <div className={`rounded-xl border p-5 shadow-md ${theme} relative`}>
            <div className="flex items-center gap-2 mb-3">
                <span className={`material-symbols-outlined text-xl ${iconTheme}`}>{icon}</span>
                <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
            </div>

            <p className="text-slate-300 text-sm mb-5">
                <strong>Definition:</strong> {definition}
            </p>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1.5 font-semibold">Exact Formula</p>
                        <p className="text-white font-bold font-mono text-xs">{formula}</p>
                    </div>
                    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-xs">lightbulb</span> Example
                        </p>
                        <p className="text-slate-300 text-xs leading-relaxed">{example}</p>
                    </div>
                </div>

                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-4 flex flex-col justify-start">
                    <p className="text-indigo-400 text-[10px] uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">troubleshoot</span>
                        Diagnostic Use
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                        {diagnosticUse}
                    </p>
                </div>
            </div>
        </div>
    );
}

// --- Internal Reusable Shift Visual ---

export interface ShiftTimelineSegment {
    label: string;
    width: string;      // Tailwind width class like w-[25%]
    color: string;      // bg color class
    textColor: string;  // text color class
    time?: string;      // optional time label
    excluded?: boolean; // if true, segment is dimmed/striped
}

export interface ShiftTimelineVisualProps {
    title: string;
    metricLabel: string;
    segments: ShiftTimelineSegment[];
    includedLabel: string;
    excludedLabel: string;
    note: string;
    accentColor: string; // border accent
}

export function ShiftTimelineVisual({ title, metricLabel, segments, includedLabel, excludedLabel, note, accentColor }: ShiftTimelineVisualProps) {
    return (
        <div className={`rounded-xl border ${accentColor} bg-slate-950/60 p-6 md:p-8`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-slate-400 text-lg">visibility</span>
                <p className="text-slate-400 uppercase text-xs tracking-wider font-semibold">
                    Visual: What's in the Denominator?
                </p>
            </div>
            <p className="text-white font-bold text-base mb-6">{title}</p>

            {/* Time Markers */}
            <div className="flex justify-between text-xs text-slate-500 font-mono mb-1 px-1">
                <span>First Scan (08:00)</span>
                <span className="hidden md:inline text-center">Mid-Shift</span>
                <span>Last Scan (16:00)</span>
            </div>

            {/* Progress Bar */}
            <div className="flex w-full h-10 rounded-lg overflow-hidden border border-slate-700 mb-4">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className={`${seg.width} ${seg.excluded ? 'opacity-25' : ''} ${seg.color} flex items-center justify-center relative group transition-opacity`}
                        style={seg.excluded ? {
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)'
                        } : undefined}
                    >
                        <span className={`text-[10px] md:text-xs font-bold ${seg.textColor} truncate px-1 select-none`}>
                            {seg.label}
                        </span>
                        {seg.excluded && (
                            <span className="absolute inset-0 flex items-center justify-center text-white/60 text-lg font-black pointer-events-none">
                                ✕
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                    <span className="text-emerald-400 text-sm font-semibold">Included:</span>
                    <span className="text-slate-300 text-sm">{includedLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-400 text-base">cancel</span>
                    <span className="text-rose-400 text-sm font-semibold">Excluded:</span>
                    <span className="text-slate-400 text-sm">{excludedLabel}</span>
                </div>
            </div>

            {/* Annotation */}
            <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800/50">
                <p className="text-slate-400 text-xs leading-relaxed italic flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                    {note}
                </p>
            </div>
        </div>
    );
}
