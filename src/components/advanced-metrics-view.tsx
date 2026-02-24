import { TrendingUp, Clock, Activity, Box, Hourglass, RefreshCw, Timer } from 'lucide-react';
import { MetricCard } from './metric-card';
import type { AnalysisResult } from '../types';
import { METRIC_TOOLTIPS } from '../logic/metric-definitions';


interface AdvancedMetricsViewProps {
    analysis: AnalysisResult;
    benchmarkAnalysis?: AnalysisResult | null;
}

export function AdvancedMetricsView({ analysis, benchmarkAnalysis }: AdvancedMetricsViewProps) {
    const { advanced, jobTimingMetrics } = analysis;
    const bench = benchmarkAnalysis?.advanced;
    const benchTiming = benchmarkAnalysis?.jobTimingMetrics;
    const isBenchmark = !!benchmarkAnalysis;

    return (
        <section className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Advanced Process Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Transition Friction"
                    value={advanced.transitionFriction}
                    icon={<TrendingUp className="w-5 h-5" />}
                    colorClass="from-orange-400 to-red-500"
                    tooltip={METRIC_TOOLTIPS.TRANSITION_FRICTION}
                    benchmarkValue={bench?.transitionFriction}
                    trend={isBenchmark && bench ? {
                        value: Number(((advanced.transitionFriction - bench.transitionFriction) / bench.transitionFriction * 100).toFixed(2)),
                        isPositiveGood: true
                    } : undefined}
                />

                <MetricCard
                    title="Pick-to-Pack Sync"
                    value={`${advanced.pickToPackSyncMin} min`}
                    icon={<Clock className="w-5 h-5" />}
                    colorClass="from-blue-400 to-cyan-500"
                    tooltip={METRIC_TOOLTIPS.PICK_TO_PACK_SYNC}
                    benchmarkValue={bench ? `${bench.pickToPackSyncMin} min` : undefined}
                    trend={isBenchmark && bench ? {
                        // Avoid division by zero if benchmark is perfectly 0
                        value: Math.abs(bench.pickToPackSyncMin) > 0.01
                            ? Number(((advanced.pickToPackSyncMin - bench.pickToPackSyncMin) / Math.abs(bench.pickToPackSyncMin) * 100).toFixed(2))
                            : 0,
                        isPositiveGood: false // Lower (more negative) is better
                    } : undefined}
                />

                <MetricCard
                    title="Active Scan Ratio"
                    value={`${(advanced.activeScanRatio * 100).toFixed(2)}%`}
                    icon={<Activity className="w-5 h-5" />}
                    colorClass="from-green-400 to-emerald-600"
                    tooltip={METRIC_TOOLTIPS.ACTIVE_SCAN_RATIO}
                    benchmarkValue={bench ? `${(bench.activeScanRatio * 100).toFixed(2)}%` : undefined}
                    trend={isBenchmark && bench ? {
                        value: Number(((advanced.activeScanRatio - bench.activeScanRatio) / bench.activeScanRatio * 100).toFixed(2)),
                        isPositiveGood: true
                    } : undefined}
                />

                <MetricCard
                    title="SKU Batchability"
                    value={advanced.skuBatchability}
                    icon={<Box className="w-5 h-5" />}
                    colorClass="from-purple-400 to-fuchsia-600"
                    tooltip={METRIC_TOOLTIPS.SKU_BATCHABILITY}
                    benchmarkValue={bench?.skuBatchability}
                    trend={isBenchmark && bench ? {
                        value: Number(((advanced.skuBatchability - bench.skuBatchability) / bench.skuBatchability * 100).toFixed(2)),
                        isPositiveGood: true
                    } : undefined}
                />

                {/* Temporal Job Metrics (Gap, Cycle, Duration) */}
                {jobTimingMetrics && (
                    <>
                        <MetricCard
                            title="Inter-Job Gap"
                            value={jobTimingMetrics.medianInterJobGapMin}
                            icon={<Hourglass className="w-5 h-5" />}
                            colorClass="from-amber-400 to-orange-500"
                            tooltip={METRIC_TOOLTIPS.INTER_JOB_GAP}
                            benchmarkValue={benchTiming?.medianInterJobGapMin}
                            trend={isBenchmark && benchTiming ? {
                                value: Number(((jobTimingMetrics.medianInterJobGapMin - benchTiming.medianInterJobGapMin) / benchTiming.medianInterJobGapMin * 100).toFixed(2)),
                                isPositiveGood: false // Lower is better (less downtime)
                            } : undefined}
                            suffix=" min"
                        />

                        <MetricCard
                            title="Job Cycle Time"
                            value={jobTimingMetrics.medianCycleTimeMin}
                            icon={<RefreshCw className="w-5 h-5" />}
                            colorClass="from-indigo-400 to-purple-500"
                            tooltip={METRIC_TOOLTIPS.JOB_CYCLE_TIME}
                            benchmarkValue={benchTiming?.medianCycleTimeMin}
                            trend={isBenchmark && benchTiming ? {
                                value: Number(((jobTimingMetrics.medianCycleTimeMin - benchTiming.medianCycleTimeMin) / benchTiming.medianCycleTimeMin * 100).toFixed(2)),
                                isPositiveGood: false // Lower usually means faster cadence
                            } : undefined}
                            suffix=" min"
                        />

                        <MetricCard
                            title="Job Duration"
                            value={jobTimingMetrics.medianJobDurationMin}
                            icon={<Timer className="w-5 h-5" />}
                            colorClass="from-blue-400 to-cyan-600"
                            tooltip={METRIC_TOOLTIPS.JOB_DURATION}
                            benchmarkValue={benchTiming?.medianJobDurationMin}
                            trend={isBenchmark && benchTiming ? {
                                value: Number(((jobTimingMetrics.medianJobDurationMin - benchTiming.medianJobDurationMin) / benchTiming.medianJobDurationMin * 100).toFixed(2)),
                                isPositiveGood: false // Lower usually means faster execution
                            } : undefined}
                            suffix=" min"
                        />
                    </>
                )}
            </div>
        </section >
    );
}
