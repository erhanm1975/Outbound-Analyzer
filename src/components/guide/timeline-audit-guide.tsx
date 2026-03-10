import React from 'react';
import { MetricCard } from './velocity-guide';

export function TimelineAuditGuide() {
    return (
        <div className="space-y-12 pb-16">
            {/* 1. Orientation Summary */}
            <div className="space-y-4">
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    The <strong>Timeline Audit</strong> (Shift Details Database) is the absolute foundational layer of our forensic capabilities.
                </p>
                <p className="text-slate-400">
                    While other dashboards aggregate data to show you *how* your building performed (Velocity, Quality, Utilization), the Timeline Audit is the unvarnished, chronological event log of exactly *what* happened. It exposes every unique system interaction the workers performed, sorted by execution sequence, allowing you to reconstruct reality and audit the algorithms themselves.
                </p>
            </div>

            <hr className="border-slate-800" />

            {/* 2. Primary Navigation & Filters */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Filtering & Controls</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    With datasets exceeding tens of thousands of rows per shift, mastering the filtration controls is essential for forensic investigation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-lg font-bold text-blue-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400">filter_alt</span>
                            Standard Narrowing
                        </h4>
                        <ul className="text-sm text-slate-300 space-y-3">
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-bold">•</span>
                                <div><strong>Target User:</strong> Search by User ID to reconstruct a specific worker's entire day, chronologically.</div>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-bold">•</span>
                                <div><strong>Target Job Code:</strong> Isolate every task performed within a specific job batch or order path.</div>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-400 font-bold">•</span>
                                <div><strong>Job Type Dropdown:</strong> Select specifically "Picking" vs "Putaway" to analyze workflow groupings.</div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-5 rounded-xl border border-rose-500/20 border-l-4 border-l-rose-500">
                    <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-rose-400">warning</span>
                        The "Anomalies Only" Toggle
                    </h4>
                    <p className="text-sm text-slate-400 mb-3">
                        This is the single most powerful tool on the screen. By toggling "Anomalies Only", the database instantly filters out normal behavior and exclusively surfacing rows where the user's hidden "Net Gap" (the empty time *between* tasks) exceeded the system's strict Break Threshold.
                    </p>
                    <p className="text-xs text-slate-500 italic">
                        Use Case: Finding exactly what time of day an operator stopped working, and for how long, when diagnosing severe drops in standard Utilization %.
                    </p>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 3. The Forensic Grid Columns */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">The Forensic Grid (Columns)</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    The dense table abstracts away basic details (like line sequences) to focus entirely on temporal constraints and phase behavior.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <MetricCard
                        title="Start to Finish"
                        scope="Micro-Timestamps"
                        direction="Context Dependent"
                        formula="Timestamp(Action N)"
                        description="The chronological boundary of a specific unit scan or item action as logged by the device."
                        example={{
                            scenario: "A user scans an LPN barcode on their RF gun.",
                            math: "Start: 08:14:02s | Finish: 08:14:04s"
                        }}
                    />
                    <MetricCard
                        title="Task Type"
                        scope="System Actions"
                        direction="Context Dependent"
                        color="indigo"
                        formula="WMS_Action_Code"
                        description="The raw physical operation being logged by the warehouse management system."
                        example={{
                            scenario: "Worker is picking items onto a cart.",
                            math: "TaskType = 'LPN_PICK'"
                        }}
                    />
                    <MetricCard
                        title="Quantity"
                        scope="Batch Integrity"
                        direction="Higher is Better"
                        color="violet"
                        formula="∑ (Units processed per scan)"
                        description="Validating if a user performed a single scan or executed a bulk-quantity movement in one system action."
                        example={{
                            scenario: "Worker confirms a pallet movement rather than a single case.",
                            math: "Quantity = 40 (instead of 1)"
                        }}
                    />
                </div>

                {/* Deep Dive into Gap Analysis */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined">timeline</span>
                        Demystifying Gap Analysis (netGap)
                    </h4>
                    <div className="space-y-6">
                        <p className="text-sm text-slate-300">
                            Traditional WMS reporting only shows you what people <strong>did</strong> (their scans). The Gap Analysis column is a proprietary metric that exposes what people <strong>didn't do</strong>.
                        </p>

                        <div className="border-l-4 border-amber-700 pl-4 py-1">
                            <h5 className="font-bold text-white mb-1">How it is calculated:</h5>
                            <p className="text-sm text-slate-300 mb-3">
                                The engine takes the exact <strong>Finish</strong> timestamp of the <em>previous</em> chronological row for that user, and measures the temporal distance to the <strong>Start</strong> timestamp of the <em>current</em> row.
                            </p>
                            <div className="bg-slate-950 p-3 rounded font-mono text-sm text-slate-400 border border-slate-800">
                                <div className="text-slate-500 text-xs mb-1">Row N (Previous Task): Finish = 10:15:00 AM</div>
                                <div className="text-slate-500 text-xs mb-2">Row N+1 (Current Task): Start = 10:27:00 AM</div>
                                <div className="text-amber-400 font-bold border-t border-slate-800 pt-2">
                                    10:27:00 - 10:15:00 = 12m netGap
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-950 p-4 rounded border border-white/5">
                                <h6 className="font-mono text-xs text-rose-400 mb-2 font-bold">[ 34m net ] LONG BREAK</h6>
                                <p className="text-xs text-slate-400">
                                    The user spent 34 minutes doing absolutely nothing identifiable in the system before triggering this specific task.
                                </p>
                            </div>
                            <div className="bg-slate-950 p-4 rounded border border-white/5">
                                <h6 className="font-mono text-xs text-slate-500 mb-2 italic">Shift Start</h6>
                                <p className="text-xs text-slate-400">
                                    Indicates this was the very first scan of the user's day (<code>gapType: FIRST_TASK</code>), therefore no preceding action exists to calculate a gap against.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
