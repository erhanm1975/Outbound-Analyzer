import React from 'react';

export function DataHealthGuide() {
    return (
        <div className="space-y-10 pb-8 text-slate-100">

            {/* 1. Summary Section */}
            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white tracking-tight">Data Health &amp; Shift Ingestion</h2>
                <div className="prose prose-invert max-w-none">
                    <p className="text-sm text-slate-300 leading-relaxed">
                        The <strong>Data Health View</strong> is the first screen you see after uploading a shift log. Its purpose is to validate the <em>integrity</em> and <em>shape</em> of the raw data before you attempt to analyze worker performance or facility throughput.
                    </p>
                    <p className="text-slate-400 text-sm">
                        If the data going into the engine is flawed (e.g., missing timestamps, unmapped job roles, or corrupted SKUs), all downstream metrics on the Velocity and Adaptation dashboards will be inaccurate. This screen helps you catch those issues early.
                    </p>
                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 2. AI vs Manual Breakdown */}
            <section className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500 text-xl">memory</span>
                    AI vs Manual Data Breakdown
                </h2>
                <p className="text-slate-400 text-sm">
                    The Job Analyzer uses a deterministic engine to reconstruct the shift, but it relies on an AI preprocessing step to format the raw, messy WMS logs into structured `Job` objects.
                </p>

                <div className="grid grid-cols-1 gap-8">
                    <MetricCard
                        title="AI Match Rate (Coverage)"
                        color="indigo"
                        direction="Higher is Better (Target: 100%)"
                        scope="Facility-Wide Log Parsing"
                        formula="(AI Generated Jobs / Total Distinct Jobs) * 100"
                        description="This metric shows what percentage of the uploaded shift logs the AI successfully understood and mapped to a known Job Type (like 'Pick', 'Pack', or 'Sort')."
                        example={{
                            scenario: "You upload a log with 10,000 barcode scans. The AI groups 9,500 of them into recognized task flows but leaves 500 as 'Manual' (unmapped) because the description string was missing from the mapping table.",
                            math: "9,500 / 10,000 = 95.0% AI Coverage"
                        }}
                        note="If this number drops below 95%, your subsequent UPH (Units Per Hour) calculations will be artificially low because the engine is throwing away work it doesn't recognize."
                    />
                </div>

                {/* Diagnostic Insights for Match Rate */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                        <h3 className="text-lg font-bold text-white mb-2">Diagnosis: Low AI Coverage</h3>
                        <p className="text-slate-300 mb-4 text-sm">
                            <strong>Symptoms:</strong> The AI Coverage pie chart is heavily red (Manual), and Match Rate is &lt; 90%.
                        </p>
                        <p className="text-slate-400 text-sm">
                            <strong>Action:</strong> You must update the <code>Job Type Mapping</code> in the configuration panel. Find the raw description strings that the WMS outputted and map them to standard task types (e.g., map "PK_Z1_FAST" to "Pick").
                        </p>
                    </div>
                </div>

            </section>

            <hr className="border-slate-800" />

            {/* 3. Order Profile Metrics */}
            <section className="space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-xl">grid_on</span>
                    The Order Profile
                </h2>
                <p className="text-slate-400 text-sm">
                    Before evaluating if your team was fast or slow, you must understand the <em>complexity</em> of the work they were given. The Order Profile sections visualize the shape of customer demand for that specific shift.
                </p>

                <div className="space-y-12">

                    {/* Unit Distribution */}
                    <div>
                        <h3 className="text-base font-bold text-white mb-3">Order Unit Distribution (Bar Chart)</h3>
                        <p className="text-slate-300 mb-3 text-sm">
                            This chart breaks down every order processed during the shift by its physical size (total units).
                        </p>
                        <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                            <li><strong>X-Axis:</strong> The size buckets (e.g., 1 Unit, 2-3 Units, 21+ Units).</li>
                            <li><strong>Y-Axis:</strong> The total count of orders that fell into that bucket.</li>
                        </ul>
                        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl mt-4 text-sm text-slate-300">
                            <strong>Diagnostic Use:</strong> If the tallest bar is "1 Unit", your building is acting as a direct-to-consumer e-commerce fulfillment center. Pickers should be highly efficient as there is no sorting required. If the tallest bars are "21+", you are performing wholesale/case-picking, and raw UPH will naturally drop as physical handling effort increases.
                        </div>
                    </div>

                    {/* Order Profile Matrix */}
                    <div>
                        <h3 className="text-base font-bold text-white mb-3">Order Profile Matrix (Heatmap)</h3>
                        <p className="text-slate-300 mb-3 text-sm">
                            The Heatmap is a cross-sectional diagnostic tool. It reverse-engineers the picking logic by comparing the breadth (Distinct SKUs) against the depth (Total Units) of every order simultaneously.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-emerald-950/10 border border-emerald-500/20 p-6 rounded-xl">
                                <h4 className="font-bold text-emerald-400 mb-2">How to Read the Grid</h4>
                                <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                                    <li><strong>X-Axis (Bottom):</strong> Total Units Per Order (Depth).</li>
                                    <li><strong>Y-Axis (Left):</strong> Distinct SKUs Per Order (Breadth).</li>
                                    <li><strong>Cell Number:</strong> The absolute count of orders fitting that exact cross-section (e.g., 1078 means exactly 1,078 orders matched that profile).</li>
                                    <li><strong>Color Intensity:</strong> The darkest emerald cell represents the highest volume concentration in the shift.</li>
                                </ul>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
                                <h4 className="font-bold text-slate-200 mb-2">Why Complexity Matters</h4>
                                <p className="text-sm text-slate-400 mb-3">Picking 100 units is not a fixed-duration task:</p>
                                <ul className="text-sm text-slate-300 space-y-2">
                                    <li><strong className="text-rose-400">Case A:</strong> 1 unit of 100 different SKUs (100 Scans, 100 separate bin locations). Extremely slow.</li>
                                    <li><strong className="text-blue-400">Case B:</strong> 100 units of the exact same SKU (1 Scan, 1 bin location). Extremely fast.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Action Cards Table */}
                        <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-300">Heatmap Pattern</th>
                                        <th className="p-4 font-semibold text-slate-300">Operational Reality</th>
                                        <th className="p-4 font-semibold text-slate-300">Expected Impact on Speed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                    <tr>
                                        <td className="p-4 text-emerald-400 font-medium">Top-Left Concentration (1 SKU, 1 Unit)</td>
                                        <td className="p-4 text-slate-300">Massive volume of "Single-Line/Single-Unit" orders (e-commerce).</td>
                                        <td className="p-4 text-slate-400">UPH should be at its absolute historical peak. Pure travel-and-scan speed.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 text-blue-400 font-medium">Horizontal Spread (High Units, Low SKUs)</td>
                                        <td className="p-4 text-slate-300">Case-picking or "Multi-Quantity" singles (e.g., buying 5 identical shirts).</td>
                                        <td className="p-4 text-slate-400">High UPH, but bottleneck shifts from walking to physical packing/boxing.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 text-rose-400 font-medium">Vertical Spread (High SKUs, Low Units)</td>
                                        <td className="p-4 text-slate-300">Small-item, high-diversity "Gift" or "Consolidated" orders.</td>
                                        <td className="p-4 text-slate-400">UPH will plummet organically. Do not penalize pickers; the math dictates a slow shift.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </section>

        </div>
    );
}

// --- Internal Reusable Card ---

interface MetricCardProps {
    title: string;
    color: 'cyan' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'violet' | 'rose' | 'slate' | 'purple';
    direction: string;
    scope: string;
    formula: string;
    description: string;
    example: { scenario: string; math: string };
    note?: string;
}

function MetricCard({ title, color, direction, scope, formula, description, example, note }: MetricCardProps) {
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
        <div className={`rounded-xl border p-5 shadow-md ${theme} relative`}>
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

            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4 font-mono text-xs relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700"></div>
                <p className="text-slate-500 mb-1 uppercase text-[10px] tracking-wider">Exact Formula</p>
                <p className="text-white font-bold text-sm break-words">{formula}</p>
                {note && (
                    <p className="text-slate-400 mt-2 text-[10px] italic">{note}</p>
                )}
            </div>

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
        </div>
    );
}
