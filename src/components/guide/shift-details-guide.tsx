import React from 'react';
import { MetricCard } from './velocity-guide';

export function ShiftDetailsGuide() {
    return (
        <div className="space-y-12 pb-16">
            {/* 1. Orientation Summary */}
            <div className="space-y-4">
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    The <strong>Shift Details</strong> Database is the unedited, raw chronological tape of your warehouse operation.
                </p>
                <p className="text-slate-400">
                    While the Forensic Engine groups and categorizes data, this view gives you direct access to the `EnrichedShiftRecord` table. Every single scan, movement, and transaction that the system successfully processed is listed here in exact sequential order, allowing for uncompromising manual audits and anomaly detection.
                </p>
            </div>

            <hr className="border-slate-800" />

            {/* 2. Controls & Filters */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Precision Filtering</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    With thousands of rows generated per shift, finding the exact moment a process derailed requires strict filtering controls at the top of the grid.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500 text-sm">person_search</span>
                            User Filter
                        </h4>
                        <p className="text-xs text-slate-400">
                            Isolates the chronological tape to a single employee's device execution history.
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500 text-sm">tag</span>
                            Job Code
                        </h4>
                        <p className="text-xs text-slate-400">
                            Filters down to a distinct financial bucket (e.g., `PICK_MEZZ`, `SORT_FLT`).
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500 text-sm">filter_list</span>
                            Job Type
                        </h4>
                        <p className="text-xs text-slate-400">
                            A system-level categorization (e.g., separating Direct Labor from Indirect Labor).
                        </p>
                    </div>

                    <div className="bg-slate-900 border-l border-t border-b border-r-4 border-slate-800 border-r-rose-500 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Anomalies Only
                        </h4>
                        <p className="text-xs text-slate-400">
                            A global toggle that hides all normal behavior and strictly returns rows that triggered a mathematical anomaly flag.
                        </p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* 3. Gap Analysis Math */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">Gap Analysis & Logic</h3>
                <p className="text-slate-400 mb-6 max-w-4xl">
                    Every row in this database represents a finished transaction. The most critical forensic column is <strong>Gap Analysis</strong>, which measures exactly how much time elapsed before this record was generated.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <MetricCard
                        title="netGap (m)"
                        scope="Chronological Distance"
                        direction="Lower is Better"
                        color="amber"
                        formula="(Current.Finish - Previous.Finish) / 60"
                        description="The raw minutes that elapsed between the completion of the immediately prior task and the completion of the current task."
                        example={{
                            scenario: "User finishes picking at 10:02:00. Next pick finishes at 10:03:30.",
                            math: "90 seconds elapsed / 60 = 1.5m netGap."
                        }}
                    />

                    <MetricCard
                        title="isAnomaly Flag"
                        scope="Threshold Breach"
                        direction="Lower is Better"
                        color="rose"
                        formula="netGap > (TaskStandard * Sigma)"
                        description="If the netGap elapsed for a specific TaskType drastically exceeds the engine's built-in mathematical expectations, the system injects a boolean true flag and highlights the row in red."
                        example={{
                            scenario: "A standard scan takes 0.5m. A user logs a gap of 18.0m on a single standard scan.",
                            math: "18.0m > Threshold = true (Anomaly Triggers Red Row Alert)."
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
