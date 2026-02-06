import React from 'react';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { RichTooltip } from '../rich-tooltip';
import { METRIC_TOOLTIPS } from '../../logic/metric-definitions';

interface TaskDurationAuditTableProps {
    auditData: {
        p10: number;
        avg: number;
        median: number;
        sampleFastest: { user: string; duration: number; job: string; sku: string }[];
        sampleSlowest: { user: string; duration: number; job: string; sku: string }[];
    };
}

export function TaskDurationAuditTable({ auditData }: TaskDurationAuditTableProps) {
    if (!auditData) return null;

    const calculatedTravel = Math.max(0, auditData.avg - auditData.p10);
    const travelPct = ((calculatedTravel / auditData.avg) * 100).toFixed(1);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Task Duration Analysis (P10 Baseline Method)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Statistical separation of Process Time vs Travel Time based on fastest tasks.
                    </p>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
                <div className="p-4 text-center">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        P10 Baseline (Process)
                        <RichTooltip content={METRIC_TOOLTIPS.AUDIT_P10} />
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">{auditData.p10.toFixed(1)}s</div>
                    <div className="text-[10px] text-slate-400 mt-1">Fastest 10% Threshold</div>
                </div>
                <div className="p-4 text-center">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        Average Duration
                        <RichTooltip content={METRIC_TOOLTIPS.AUDIT_AVG} />
                    </div>
                    <div className="text-2xl font-bold text-slate-700">{auditData.avg.toFixed(1)}s</div>
                    <div className="text-[10px] text-slate-400 mt-1">Mean of ALL Picking Tasks</div>
                </div>
                <div className="p-4 text-center bg-amber-50/30">
                    <div className="text-xs text-amber-600 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        Calculated Travel
                        <RichTooltip content={METRIC_TOOLTIPS.AUDIT_TRAVEL} />
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{calculatedTravel.toFixed(1)}s</div>
                    <div className="text-[10px] text-amber-500 mt-1">Avg - P10 ({travelPct}%)</div>
                </div>
                <div className="p-4 text-center">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        Median Duration
                        <RichTooltip content={METRIC_TOOLTIPS.AUDIT_MEDIAN} />
                    </div>
                    <div className="text-xl font-semibold text-slate-600">{auditData.median.toFixed(1)}s</div>
                    <div className="text-[10px] text-slate-400 mt-1">50th Percentile</div>
                </div>
            </div>

            {/* Extremes Audit Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-slate-200">
                {/* Fastest Samples */}
                <div className="border-r border-slate-200 p-4">
                    <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Fastest 5 Tasks (Defining Baseline)
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100 text-left">
                                    <th className="pb-2 font-medium">User</th>
                                    <th className="pb-2 font-medium">Job</th>
                                    <th className="pb-2 font-medium">Duration</th>
                                    <th className="pb-2 font-medium">SKU</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {auditData.sampleFastest.map((rec, i) => (
                                    <tr key={i} className="hover:bg-emerald-50/50">
                                        <td className="py-2 text-slate-700 font-medium">{rec.user}</td>
                                        <td className="py-2 text-slate-500">{rec.job}</td>
                                        <td className="py-2 text-emerald-600 font-bold">{rec.duration.toFixed(1)}s</td>
                                        <td className="py-2 text-slate-400 font-mono">{rec.sku}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Slowest Samples */}
                <div className="p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-rose-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        Slowest 5 Tasks (Driving Travel Draft)
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100 text-left">
                                    <th className="pb-2 font-medium">User</th>
                                    <th className="pb-2 font-medium">Job</th>
                                    <th className="pb-2 font-medium">Duration</th>
                                    <th className="pb-2 font-medium">SKU</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {auditData.sampleSlowest.map((rec, i) => (
                                    <tr key={i} className="hover:bg-rose-50/50">
                                        <td className="py-2 text-slate-700 font-medium">{rec.user}</td>
                                        <td className="py-2 text-slate-500">{rec.job}</td>
                                        <td className="py-2 text-rose-600 font-bold">{rec.duration.toFixed(1)}s</td>
                                        <td className="py-2 text-slate-400 font-mono">{rec.sku}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
