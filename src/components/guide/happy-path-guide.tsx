import React from 'react';
import { MetricCard, ShiftTimelineVisual, TimelineCard } from './velocity-guide';

export function HappyPathGuide() {
    return (
        <div className="space-y-12">

            {/* 1. Orientation Summary */}
            <div className="space-y-4">
                <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
                    The <strong>Engineered Standards Impact</strong> (Happy Path Analysis) dashboard provides the theoretical minimum time required to complete a set of jobs based on the active warehouse standards configuration. It serves as the baseline to identify structural friction (e.g., poor density, excessive travel proxy) versus operational friction (e.g., associates working below standard pace).
                </p>
                <hr className="border-slate-800 my-6" />
            </div>

            {/* 2. Metric Cards */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Core Path Metrics</h3>

                <MetricCard
                    title="Total Happy Path Duration"
                    color="cyan"
                    direction="Lower is Better (for identical volume)"
                    scope="Wave or Global Aggregate"
                    formula="∑ (Initialization + Process Time + Travel Time) across all phases (Pick, Sort, Pack)"
                    description="Calculates the strict standard allowance for a wave based on its exact orders, lines, and units. If a wave has a 4-hour Happy Path, any actual duration above 4 hours represents frictional loss (either systemic or operational)."
                    example={{
                        scenario: "A wave includes 500 units requiring 100 bin visits. The standard allocates 2s per unit scan, 10s per travel proxy, and 15s job setup.",
                        math: "Happy Path = (500 units × 2s) + (100 proxy × 10s) + (10 jobs × 15s) = 2150 seconds."
                    }}
                />

                <MetricCard
                    title="Avg Time / Unit"
                    color="violet"
                    direction="Lower is Better"
                    scope="Aggregate Efficiency Standard"
                    formula="Total Happy Path Duration / Total Units"
                    description="The theoretical minimum number of seconds required to process one unit in the selected data slice. It serves as a pure baseline to measure actual floor performance against, factoring in all travel and overhead proxies."
                    example={{
                        scenario: "A wave's Happy Path is 6,400 seconds for 800 units.",
                        math: "6400s / 800 units = 8 seconds per unit theoretical baseline."
                    }}
                />

                <MetricCard
                    title="Pick Density (units/loc)"
                    color="emerald"
                    direction="Higher is Better"
                    scope="Wave or Global Aggregate"
                    formula="Total Units / Total Locations Visited"
                    description="The average number of units picked per location visit. High density severely dilutes travel proxy time across more units, radically improving the floor UPH potential."
                    example={{
                        scenario: "1,500 units were picked across 300 location visits.",
                        math: "1500 units / 300 locations = 5 units per location."
                    }}
                />
            </div>

            {/* 3. Visual Dissection (Timeline Bars) */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Anatomy of the Standard</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    Every task is calculated by aggregating three distinct phases of standard assignment.
                </p>

                <ShiftTimelineVisual
                    title="Job Standard Time Decomposition"
                    metricLabel="Happy Path Component Setup"
                    accentColor="border-cyan-500/20"
                    segments={[
                        { label: 'Initialization', width: 'w-[15%]', color: 'bg-indigo-600', textColor: 'text-white' },
                        { label: 'Pick Travel', width: 'w-[35%]', color: 'bg-amber-600', textColor: 'text-white' },
                        { label: 'Pick Process', width: 'w-[50%]', color: 'bg-cyan-600', textColor: 'text-white' },
                    ]}
                    includedLabel="Active Standard Phasing"
                    excludedLabel="N/A"
                    note="The proportion of Travel to Process can shift radically depending on Pick Density. Poorly routed waves will show a massive Travel block."
                />
            </div>

            {/* 4. Calculation Walkthrough */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">How Happy Path is Calculated (Raw Data to Standard)</h3>
                <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
                    <p>
                        The Job Analyzer reconstructs the Happy Path directly from raw WMS telemetry (e.g., CSV exports containing Timestamps, User IDs, Locations, and Quantities). It does not rely on WMS-provided summaries, but instead recalculates the theoretical duration event-by-event.
                    </p>

                    <h4 className="text-lg font-medium text-blue-400 mt-6 mb-2">Step 1: Raw Data Ingestion & Job Grouping</h4>
                    <p>
                        Raw scans are ingested and grouped by <code>Job_ID</code> or <code>Assignment_ID</code>. They are sorted chronologically. Within a job, individual events (like "Scan Item A at Bin 123", "Scan Item B at Bin 124") become sequential <strong>TaskObjects</strong>.
                    </p>
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-800 text-sm font-mono overflow-x-auto">
                        <span className="text-slate-500">// Example Raw Input</span><br />
                        10:00:00 - User123 - PickJobX - Loc: A-101 - Qty: 2<br />
                        10:01:20 - User123 - PickJobX - Loc: A-105 - Qty: 1<br />
                        10:02:15 - User123 - PickJobX - Loc: B-200 - Qty: 3
                    </div>

                    <h4 className="text-lg font-medium text-blue-400 mt-6 mb-2">Step 2: Multi-Phase Micro-Standard Application</h4>
                    <p>
                        For each <code>TaskObject</code>, the engine identifies the <strong>Phase</strong> (Picking, Sorting, Packing, Loading) and looks at the configured <strong>Engineered Labor Standards</strong> for that specific workflow. It applies allowances based on the phase's requirements:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Initialization (Fixed Overheads):</strong> Applied once per Job, Pack Station, or Cart (e.g., <em>30s to fetch a Pick Cart</em> or <em>15s to log into a Pack Station</em>).</li>
                        <li><strong>Travel Proxy (Distance):</strong> Mainly applicable in Picking. If the associate moves to a new location, a travel standard is applied (e.g., <em>8s per inter-bin travel</em>).</li>
                        <li><strong>Process Proxy (Volume):</strong> Applied to the quantity processed depending on the phase:
                            <ul className="list-circle pl-5 mt-1 text-sm text-slate-400">
                                <li><strong className="text-slate-300">Picking:</strong> Scanning units (e.g., <em>2s per unit</em>).</li>
                                <li><strong className="text-slate-300">Sorting:</strong> Scanning totes and dropping units into put-wall chutes (e.g., <em>3s per scan-and-put</em>).</li>
                                <li><strong className="text-slate-300">Packing:</strong> Scanning the chute, building the box, dunnage, and taping (e.g., <em>12s to build box, 3s per item placed, 8s to tape & label</em>).</li>
                            </ul>
                        </li>
                    </ul>

                    <h4 className="text-lg font-medium text-blue-400 mt-6 mb-2">Step 3: Temporal Aggregation (Example: Picking)</h4>
                    <p>
                        The engine sums up the micro-standards for all tasks within the job. Here is how the example above would be calculated:
                    </p>
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-800 text-sm overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="pb-2">Task / Event</th>
                                    <th className="pb-2">Action</th>
                                    <th className="pb-2">Applied Standard</th>
                                    <th className="pb-2 text-right">Time Allowance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr>
                                    <td className="py-2">Start PickJobX</td>
                                    <td className="py-2 text-indigo-400">Initialize Cart</td>
                                    <td className="py-2 font-mono text-xs">Job_Setup_Time</td>
                                    <td className="py-2 text-right text-emerald-400">+30s</td>
                                </tr>
                                <tr>
                                    <td className="py-2">Loc: A-101 (Qty: 2)</td>
                                    <td className="py-2">
                                        <div className="text-amber-500">Walk to First Loc</div>
                                        <div className="text-cyan-500">Scan 2 Units</div>
                                    </td>
                                    <td className="py-2 font-mono text-xs">First_Loc_Travel_Time<br />(2 × Unit_Scan_Time)</td>
                                    <td className="py-2 text-right">
                                        <div className="text-emerald-400">+15s</div>
                                        <div className="text-emerald-400">+4s</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2">Loc: A-105 (Qty: 1)</td>
                                    <td className="py-2">
                                        <div className="text-amber-500">Walk to Next Loc</div>
                                        <div className="text-cyan-500">Scan 1 Unit</div>
                                    </td>
                                    <td className="py-2 font-mono text-xs">Inter_Loc_Travel_Time<br />(1 × Unit_Scan_Time)</td>
                                    <td className="py-2 text-right">
                                        <div className="text-emerald-400">+8s</div>
                                        <div className="text-emerald-400">+2s</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2">Loc: B-200 (Qty: 3)</td>
                                    <td className="py-2">
                                        <div className="text-amber-500">Walk to Next Loc (Aisle Change)</div>
                                        <div className="text-cyan-500">Scan 3 Units</div>
                                    </td>
                                    <td className="py-2 font-mono text-xs">Inter_Aisle_Travel_Time<br />(3 × Unit_Scan_Time)</td>
                                    <td className="py-2 text-right">
                                        <div className="text-emerald-400">+12s</div>
                                        <div className="text-emerald-400">+6s</div>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot className="border-t border-slate-700">
                                <tr>
                                    <td colSpan={3} className="pt-3 font-semibold text-white">Total Happy Path Duration (Picking)</td>
                                    <td className="pt-3 text-right font-bold text-cyan-400">77 Seconds</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <h5 className="font-medium text-slate-200 mt-6 mb-2">Example: Sorting (Put-Wall)</h5>
                    <p className="mb-2 text-sm text-slate-400">Sorting assumes the associate is stationary at a Put-Wall, heavily indexing on Volume (Process Proxy) rather than Distance (Travel Proxy).</p>
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-800 text-sm overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="pb-2">Task / Event</th>
                                    <th className="pb-2">Action</th>
                                    <th className="pb-2">Applied Standard</th>
                                    <th className="pb-2 text-right">Time Allowance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr>
                                    <td className="py-2">Start Sort Batch</td>
                                    <td className="py-2 text-indigo-400">Scan Tote & Setup</td>
                                    <td className="py-2 font-mono text-xs">Job_Setup_Time</td>
                                    <td className="py-2 text-right text-emerald-400">+10s</td>
                                </tr>
                                <tr>
                                    <td className="py-2">Sort Item (Qty: 5)</td>
                                    <td className="py-2 text-cyan-500">Scan Item & Put in Chute</td>
                                    <td className="py-2 font-mono text-xs">5 × Unit_Sort_Time</td>
                                    <td className="py-2 text-right text-emerald-400">+15s</td>
                                </tr>
                            </tbody>
                            <tfoot className="border-t border-slate-700">
                                <tr>
                                    <td colSpan={3} className="pt-3 font-semibold text-white">Total Happy Path Duration (Sorting)</td>
                                    <td className="pt-3 text-right font-bold text-cyan-400">25 Seconds</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <h5 className="font-medium text-slate-200 mt-6 mb-2">Example: Packing</h5>
                    <p className="mb-2 text-sm text-slate-400">Packing standards factor in discrete box-building overheads combined with item-level placement speeds.</p>
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-800 text-sm overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="pb-2">Task / Event</th>
                                    <th className="pb-2">Action</th>
                                    <th className="pb-2">Applied Standard</th>
                                    <th className="pb-2 text-right">Time Allowance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr>
                                    <td className="py-2">Pack Box X</td>
                                    <td className="py-2 text-indigo-400">Scan Chute / Build Box</td>
                                    <td className="py-2 font-mono text-xs">Box_Setup_Time</td>
                                    <td className="py-2 text-right text-emerald-400">+12s</td>
                                </tr>
                                <tr>
                                    <td className="py-2">Place Items (Qty: 4)</td>
                                    <td className="py-2 text-cyan-500">Add Dunnage & Items</td>
                                    <td className="py-2 font-mono text-xs">4 × Unit_Pack_Time</td>
                                    <td className="py-2 text-right text-emerald-400">+12s</td>
                                </tr>
                                <tr>
                                    <td className="py-2">Finish Box X</td>
                                    <td className="py-2 text-amber-500">Tape & Label</td>
                                    <td className="py-2 font-mono text-xs">Tape_Label_Time</td>
                                    <td className="py-2 text-right text-emerald-400">+8s</td>
                                </tr>
                            </tbody>
                            <tfoot className="border-t border-slate-700">
                                <tr>
                                    <td colSpan={3} className="pt-3 font-semibold text-white">Total Happy Path Duration (Packing)</td>
                                    <td className="pt-3 text-right font-bold text-cyan-400">32 Seconds</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <h4 className="text-lg font-medium text-blue-400 mt-6 mb-2">Step 4: Comparison vs. Actual</h4>
                    <p>
                        In our example, the raw timestamps show the associate finished at <code>10:02:15</code>, taking <strong>135 seconds</strong> of actual floor time.
                    </p>
                    <p className="border-l-4 border-slate-600 pl-4 py-1 text-slate-400 italic">
                        Actual Duration (135s) &gt; Happy Path Standard (77s).<br />
                        <strong>Result:</strong> 58 seconds of undocumented friction occurred (e.g., blocked aisles, missing inventory, or slow walking pace).
                    </p>
                </div>
            </div>

            {/* 5. Summary Breakdown Tab Documentation */}
            <div className="space-y-6">
                <hr className="border-slate-800 my-8" />
                <h3 className="text-xl font-semibold text-white mb-4">The Summary Breakdown Tab</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    While the <strong>Jobs View</strong> provides line-item details, the <strong>Summary Breakdown</strong> tab calculates macro-level averages and absolute totals across all filtered data. This is crucial for establishing baseline targets.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Key Performance Indicators */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-400">bar_chart</span>
                            Key Performance Indicators
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex flex-col">
                                <span className="font-medium text-cyan-300">Pick Density (units/loc)</span>
                                <span className="text-slate-400">The most dictating factor of warehouse speed. Total Units / Total Unique Location Visits. Below 1.2 is deeply problematic.</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="font-medium text-slate-300">Total Visits vs. Waves</span>
                                <span className="text-slate-400">Shows the raw volume of locations visited across the selected waves. High visits with low units = poor efficiency.</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="font-medium text-indigo-300">Total Jobs</span>
                                <span className="text-slate-400">The absolute count of distinct work assignments (Job Codes) issued to the floor.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Average Time Metrics */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-400">schedule</span>
                            Average Time Metrics
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex flex-col">
                                <span className="font-medium text-emerald-400">Avg Time / Order (sec)</span>
                                <span className="text-slate-400">Total Happy Path Duration / Unique Orders. The standard speed to fulfill an entire customer order.</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="font-medium text-violet-400">Avg Time / Unit (sec)</span>
                                <span className="text-slate-400">The blended theoretical baseline to process a single item from rack to dock, factoring in travel and fixed job setups.</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="font-medium text-amber-400">Avg Time / Order Line</span>
                                <span className="text-slate-400">Duration standard per distinct SKU/Location combinaton ordered.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Duration Analysis */}
                <h4 className="text-lg font-medium text-blue-400 mt-6 mb-2">Duration Analysis & Time Usage</h4>
                <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5">
                    <p className="text-sm text-slate-400 mb-4">
                        The bottom pane of the Summary tab reconstructs exactly where time is allocated based on the engineered standard models.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h5 className="font-bold text-slate-200 mb-3 border-b border-white/10 pb-2">Global Time Usage (Picking)</h5>
                            <ul className="space-y-2 text-sm">
                                <li className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                                    <span className="text-slate-300">Total Direct Picking</span>
                                    <span className="text-xs text-slate-500">Pure Unit Scan Time</span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                                    <span className="text-slate-300">Total Pick Travel</span>
                                    <span className="text-xs text-slate-500">Aisle/Bin Transitions</span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                                    <span className="text-slate-300">Total Inter-Job Duration</span>
                                    <span className="text-xs text-slate-500">Cart Initialization/Setup</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-200 mb-3 border-b border-white/10 pb-2">Process Phase Breakdown</h5>
                            <ul className="space-y-2 text-sm">
                                <li className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                                    <span className="text-slate-300">Total Picking Time</span>
                                    <span className="text-xs text-slate-500 text-right">Sum of Picking Usage<br />(Process + Travel + Init)</span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                                    <span className="text-slate-300">Total Sorting Time</span>
                                    <span className="text-xs text-slate-500">Put-Wall Allocation Time</span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                                    <span className="text-slate-300">Total Packing Time</span>
                                    <span className="text-xs text-slate-500">Box Build & Tape Time</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>

            {/* 6. Jobs View Tab Documentation */}
            <div className="space-y-6">
                <hr className="border-slate-800 my-8" />
                <h3 className="text-xl font-semibold text-white mb-4">The Jobs View Tab</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The <strong>Jobs View</strong> provides a highly granular, line-by-line breakdown of every distinct workload entity (Job, Cart, order) ingested from the raw data.
                </p>

                <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400">table_rows</span>
                        Reading the Grid Columns
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                        The grid dissects the exact components of the total standard applied to each line item, segmented by operational phase:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <h5 className="font-semibold text-cyan-300 border-b border-cyan-500/20 pb-1">Picking Dissection</h5>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li><strong className="text-slate-300">Picking Init:</strong> Base job setup time.</li>
                                <li><strong className="text-slate-300">Picking Process:</strong> Scan and pick time.</li>
                                <li><strong className="text-slate-300">Picking Travel:</strong> Navigation between bins.</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-semibold text-emerald-300 border-b border-emerald-500/20 pb-1">Sorting Dissection</h5>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li><strong className="text-slate-300">Sorting Init:</strong> Tote/Station setup time.</li>
                                <li><strong className="text-slate-300">Sorting Process:</strong> Put-to-chute volume.</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-semibold text-amber-300 border-b border-amber-500/20 pb-1">Packing Dissection</h5>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li><strong className="text-slate-300">Packing Init:</strong> Box build overhead.</li>
                                <li><strong className="text-slate-300">Packing Process:</strong> Dunning and item placement.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-indigo-950/20 p-4 rounded mt-6 border border-indigo-500/10">
                        <h5 className="font-bold text-white mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-400 text-sm">unfold_more</span>
                            The Job Breakdown Overlay
                        </h5>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Clicking exactly on a target job row expands an inline diagnostic payload. This view forces extreme transparency by itemizing the exact formulas executed, and laying out every single parameter fed into that specific phase class (e.g. <em>15s Base Setup + 5s Inter-Loc Travel</em>).
                        </p>
                    </div>
                </div>
            </div>

            {/* 7. Detail View Documentation */}
            <div className="space-y-6">
                <hr className="border-slate-800 my-8" />
                <h3 className="text-xl font-semibold text-white mb-4">The Detail View (Amortized Breakdown)</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The <strong>Detail View</strong> is built for extreme forensic auditing. It features a heavily nested, 3-level deep breakdown to completely demystify exactly how the final second-level standard was calculated for any given piece of work.
                </p>

                <div className="space-y-6">
                    {/* Level 1 */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 border-l-4 border-l-slate-600">
                        <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-sm text-slate-400">filter_1</span>
                            Level 1: The Job Root
                        </h4>
                        <p className="text-sm text-slate-400">
                            The top-level row summarizes the total aggregated footprint of the job code. It displays the sum of <strong>Orders, SKUs, Units, and Locations</strong> handled, alongside the master <strong>Total Standard Duration (sec)</strong> that was calculated.
                        </p>
                    </div>

                    {/* Level 2 */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 border-l-4 border-l-cyan-600 ml-4">
                        <h4 className="text-lg font-bold text-cyan-200 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-sm text-cyan-400">filter_2</span>
                            Level 2: Task Container Isolation
                        </h4>
                        <p className="text-sm text-slate-400">
                            Expanding a <em>Job</em> reveals every individual <strong>Task</strong> (Action Line) performed within that job. You can see the isolated task type (e.g., <em>PICK</em> vs <em>PACK</em>), the specific Order ID and SKU targeted, the Quantity handled on that line, and the isolated <strong>Standard Duration</strong> awarded solely to that line item.
                        </p>
                    </div>

                    {/* Level 3 */}
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 border-l-4 border-l-purple-500 ml-8">
                        <h4 className="text-lg font-bold text-purple-200 flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-sm text-purple-400">filter_3</span>
                            Level 3: Amortized Micro-Activities
                        </h4>
                        <p className="text-sm text-slate-400 mb-3">
                            Expanding a specific <em>Task</em> exposes the ultimate transparency layer. This view takes the <strong>Standard Card</strong> configured for this workflow and itemizes exactly how its formulas were executed for this explicit line.
                        </p>
                        <div className="bg-slate-950 p-3 rounded border border-white/10 text-xs">
                            <div className="flex justify-between text-slate-300 font-mono mb-1">
                                <span>Initialization Bucket</span>
                                <span className="text-slate-500">(Job_Setup / Total Tasks In Job)</span>
                                <span className="text-cyan-400">1.52s</span>
                            </div>
                            <div className="flex justify-between text-slate-300 font-mono">
                                <span>Process Bucket</span>
                                <span className="text-slate-500">(Unit_Speed * Task Qty)</span>
                                <span className="text-cyan-400">8.00s</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 italic">
                            For instance, if a Job has a 30s fixed setup and contains 10 tasks, you will clearly see 3s <em>amortized</em> onto this single task's initialization bucket.
                        </p>
                    </div>
                </div>
            </div>

            {/* 8. Actionable Insights */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Diagnostics & Insights</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    Use Happy Path metrics to separate system issues from people issues.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TimelineCard
                        title="Low Density / High Travel"
                        icon="keyboard_double_arrow_down"
                        color="rose"
                        definition="A wave shows exceptional pickers but terrible Floor UPH."
                        formula="High Density = Fast Packing, Slow Travel"
                        example="Check Pick Density. If it is < 1.2 units/loc, your wave logic is generating single-unit picks across the building. The Happy Path will be dominated by the Travel Proxy."
                        diagnosticUse="Indicates a WMS waving/routing issue, not an associate performance issue."
                    />

                    <TimelineCard
                        title="Actual Duration > Happy Path"
                        icon="timer_off"
                        color="amber"
                        definition="It consistently takes 6+ hours to finish a 4-hour standard wave."
                        formula="Actual Duration - Happy Path = Frictional Loss"
                        example="If picking actuals align with standard, but the overall wave took longer, look at the Inter-Job Time or Replenishment blockers on the timeline."
                        diagnosticUse="Tells engineering that the 'Standard' might be too tight, or tells ops there is hidden friction (blockages, missing inventory) slowing down the floor."
                    />
                </div>
            </div>

        </div>
    );
}
