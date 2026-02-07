import React from 'react';

export function VelocityGuide() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-12">

            {/* 1. Summary Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h2>
                <div className="prose dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-300">
                        The <strong>Velocity Dashboard</strong> is the primary specialized view for analyzing warehouse throughput speed and flow efficiency.
                        It focuses on high-level "Speed Limit" metrics to understand how fast the facility is moving and identifying bottlenecks in the chronological task flow (Pick -&gt; Pack).
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                        Use this screen to:
                    </p>
                    <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                        <li>Monitor the <strong>"Pick Flow Velocity"</strong> (Units per Labor Hour) as the ultimate measure of ROI.</li>
                        <li>Compare <strong>Productive Picked UPH</strong> (active time only) vs. <strong>Floor Picked UPH</strong> (total time) to gauge utilization.</li>
                        <li>Analyze the time cost of each step in the process (Picking, Travel, Packing) using the <strong>Task Performance Breakdown</strong>.</li>
                        <li>Track <strong>Pick Density</strong> to see how many units are grabbed per stop.</li>
                    </ul>
                </div>
            </section>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* 2. Hero Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* How to Read */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">menu_book</span>
                        Primary Metrics
                    </h2>
                    <div className="space-y-6">

                        {/* Pick Flow Velocity */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">Pick Flow Velocity</h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-4">
                                The most important number on the screen. It represents the <strong>Facility ROI</strong>: How many units were shipped for every hour of labor paid?
                            </p>
                            <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm space-y-2">
                                <p><span className="text-slate-400">Formula:</span> <span className="text-cyan-600 dark:text-cyan-400 font-bold">Total Units / Σ(Active User Hours)</span></p>
                                <div className="text-xs text-slate-500 space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <p><strong>Where Active User Hours is the hourly sum of all users contributing to the process.</strong></p>
                                    <p>It represents the total labor investment to achieve the output. Since raw data lacks "Clock In/Out" times, this is calculated as:</p>
                                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                        <li><strong>Derivation:</strong> Time elapsed between a user's <em>First Task Start</em> and <em>Last Task Finish</em>.</li>
                                        <li>Example: First scan at 8:00 AM, Last scan at 4:00 PM = 8 Hours.</li>
                                        <li>This captures all time the user was present in the data, including natural gaps and breaks.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Productive Picked UPH */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">Productive Picked UPH</h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-4">
                                Measures speed <em>only when working</em>. It strips out breaks, long pauses, and idle time to show the pure mechanical potential of the team.
                            </p>
                            <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm space-y-2">
                                <p><span className="text-slate-400">Formula:</span> <span className="text-blue-600 dark:text-blue-400 font-bold">Total Units / (Active Time - Breaks)</span></p>
                                <div className="text-xs text-slate-500 space-y-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <div>
                                        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">1. Active Time (Included in Calculation)</p>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                            <li><strong>Task Execution:</strong> Time spent physically scanning, picking, or packing.</li>
                                            <li><strong>Travel:</strong> Estimated walking time between locations.</li>
                                            <li><strong>Micro-Gaps (&lt; 5m):</strong> Brief pauses for orientation, moving boxes, or glancing at scanner.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">2. Breaks (Excluded from Calculation)</p>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                            <li><strong>Major Gaps (&gt; 5m):</strong> Any single pause longer than 5 minutes is automatically flagged as a break.</li>
                                            <li><strong>Logic:</strong> These represent lunch, rest breaks, or off-floor tasks (e.g., battery change).</li>
                                            <li>They are completely removed from the denominator to isolate pure mechanical speed.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floor Picked UPH */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Floor Picked UPH</h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-4">
                                The raw unadjusted speed. Total Volume divided by Total Time elapsed, regardless of breaks or downtime.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Breakdown */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-500">donut_large</span>
                        Secondary Metrics
                    </h2>
                    <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Pick Density (Units/Loc)</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Higher is better. A high density means pickers are grabbing multiple items per stop, which increases UPH without extra effort.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Break (Time)</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                The amortized cost of breaks and lunches spread across every unit. If this is high, the team is taking excessive downtime relative to volume.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* 3. Output Density */}
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Density Metrics</h2>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mb-2">Output Density</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                        A measure of pick density. High density means less walking per unit produced.
                    </p>
                    <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm space-y-2">
                        <p><span className="text-slate-400">Formula:</span> <span className="text-amber-600 dark:text-amber-400 font-bold">Total Units / Unique Locations Visited</span></p>
                        <p className="text-xs text-slate-500">Example: Picking 100 units from 10 distinct bin locations = Density of 10.0.</p>
                    </div>
                </div>
            </section>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* 4. Task Performance Breakdown */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Task Performance Breakdown</h2>
                <p className="text-slate-500 dark:text-slate-400">
                    The timeline at the bottom separates the lifecycle of a unit into distinct time buckets.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-slate-400">schedule</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Inter-Job</span>
                        </div>
                        <p className="text-sm text-slate-500">Time wasted between finishing one request and starting the next.</p>
                    </div>

                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-blue-500">shopping_cart</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Pick Time</span>
                        </div>
                        <p className="text-sm text-slate-500">Time spent physically executing the pick at the bin face.</p>
                    </div>

                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-slate-400">local_shipping</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Travel</span>
                        </div>
                        <p className="text-sm text-slate-500">Estimated walking time between locations (derived via P10 heuristics).</p>
                    </div>

                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-pink-500">inventory_2</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Pack</span>
                        </div>
                        <p className="text-sm text-slate-500">Time spent packing the order at the consolidation station.</p>
                    </div>
                </div>
            </section>

        </div>
    );
}
