import { useMemo } from 'react';
import type { ShiftAnalysis } from '../logic/analysis';
import { AlertTriangle, CheckCircle, Copy, FileText, TrendingDown, TrendingUp } from 'lucide-react';

interface ExecutiveReportViewProps {
    analysis: ShiftAnalysis;
    benchmarkAnalysis?: ShiftAnalysis | null;
    benchmarkName?: string | null;
}

export function ExecutiveReportView({ analysis, benchmarkAnalysis, benchmarkName }: ExecutiveReportViewProps) {

    // Helper to calculate delta%
    const getDelta = (curr: number, base: number) => {
        if (!base) return 0;
        return ((curr - base) / base) * 100;
    };

    const report = useMemo(() => {
        const pPick = analysis.stats.picking;
        const pPack = analysis.stats.packing;
        const bPick = benchmarkAnalysis?.stats.picking;
        const bPack = benchmarkAnalysis?.stats.packing;

        const hasBenchmark = !!benchmarkAnalysis && !!bPick && !!bPack;

        const pickUphDelta = hasBenchmark ? getDelta(pPick.uph, bPick!.uph) : 0;
        const packUphDelta = hasBenchmark ? getDelta(pPack.uph, bPack!.uph) : 0;

        // Generate Narrative
        const summaryPoints = [];

        // 1. Overall Pulse
        let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (hasBenchmark) {
            if (pickUphDelta > 5 && packUphDelta > 5) {
                summaryPoints.push("Strong improvement across both Picking and Packing operations compared to benchmark.");
                overallSentiment = 'positive';
            } else if (pickUphDelta < -5 && packUphDelta < -5) {
                summaryPoints.push("Performance degradation observed in both primary operational flows.");
                overallSentiment = 'negative';
            } else if (pickUphDelta > 5) {
                summaryPoints.push("Picking Operations outperformed the benchmark, driving overall volume.");
                overallSentiment = 'positive';
            } else if (packUphDelta > 5) {
                summaryPoints.push("Packing Operations showed strong throughput resilience despite upstream variance.");
                overallSentiment = 'positive';
            } else {
                summaryPoints.push("Operations remained consistent with benchmark levels.");
            }
        } else {
            summaryPoints.push(`Analyzed ${analysis.records.length.toLocaleString()} tasks across Picking and Packing flows.`);
        }

        // 2. Picking Specifics
        const pickingNarrative = [];
        pickingNarrative.push(`Picking Team achieved **${pPick.uph} UPH** (Occupancy) processing **${pPick.totalVolume.toLocaleString()} units**.`);
        if (hasBenchmark) {
            const verb = pickUphDelta > 0 ? "led" : "lagged";
            const adj = Math.abs(pickUphDelta) > 10 ? "significantly" : "slightly";
            pickingNarrative.push(`This performance **${adj} ${verb}** the ${benchmarkName} baseline by **${Math.abs(pickUphDelta).toFixed(2)}%**.`);
        }

        // 3. Packing Specifics
        const packingNarrative = [];
        packingNarrative.push(`Packing Team cleared **${pPack.totalVolume.toLocaleString()} units** at a rate of **${pPack.uph} UPH**.`);
        if (pPack.utilization < 70) {
            packingNarrative.push(`⚠️ Note: Packing Utilization is low (**${pPack.utilization}%**), suggesting potential overstaffing or upstream starvation.`);
        } else if (pPack.utilization > 95) {
            packingNarrative.push(`🔥 Note: Packing Utilization is extremely high (**${pPack.utilization}%**), indicating a potential bottleneck or understaffing.`);
        }

        return {
            overallSentiment,
            summaryPoints,
            pickingNarrative,
            packingNarrative,
            pickUphDelta,
            packUphDelta,
            hasBenchmark
        };
    }, [analysis, benchmarkAnalysis, benchmarkName]);

    const copyToClipboard = () => {
        const text = `
EXECUTIVE BRIEFING: OUTBOUND OPERATIONS
---------------------------------------
PULSE: ${report.summaryPoints.join(' ')}

PICKING ANALYSIS
- Rate: ${analysis.stats.picking.uph} UPH (Occupancy)
- Volume: ${analysis.stats.picking.totalVolume.toLocaleString()} Units
- Insight: ${report.pickingNarrative.join(' ')}

PACKING ANALYSIS
- Rate: ${analysis.stats.packing.uph} UPH (Occupancy)
- Volume: ${analysis.stats.packing.totalVolume.toLocaleString()} Units
- Insight: ${report.packingNarrative.join(' ')}
        `.trim();
        navigator.clipboard.writeText(text);
        alert("Report copied to clipboard!");
    };

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500 p-6">

            {/* Header / Actions */}
            <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Executive Briefing
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg">
                        Operational Supervision Report &bull; {new Date().toLocaleDateString()}
                    </p>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                    <Copy className="w-4 h-4" />
                    Copy Narrative
                </button>
            </div>

            {/* Executive Summary Block */}
            <div className={`
                p-8 rounded-2xl border-l-8 shadow-sm
                ${report.overallSentiment === 'positive' ? 'bg-emerald-50 border-emerald-500' :
                    report.overallSentiment === 'negative' ? 'bg-rose-50 border-rose-500' :
                        'bg-white border-slate-300'}
            `}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2
                    ${report.overallSentiment === 'positive' ? 'text-emerald-700' :
                        report.overallSentiment === 'negative' ? 'text-rose-700' : 'text-slate-500'}
                `}>
                    {report.overallSentiment === 'positive' ? <CheckCircle className="w-5 h-5" /> :
                        report.overallSentiment === 'negative' ? <AlertTriangle className="w-5 h-5" /> :
                            <FileText className="w-5 h-5" />}
                    Executive Summary
                </h3>
                <p className="text-xl font-medium text-slate-800 leading-relaxed">
                    {report.summaryPoints.join(' ')}
                </p>
            </div>

            {/* Detailed Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Picking Column */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold text-slate-700">Picking Operations</h4>
                        {report.hasBenchmark && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                                ${report.pickUphDelta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                            `}>
                                {report.pickUphDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(report.pickUphDelta).toFixed(2)}% vs Bmk
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-600 leading-relaxed">
                            {report.pickingNarrative.map((text, i) => (
                                <span key={i} dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') + ' ' }} />
                            ))}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-semibold">Volume</div>
                                <div className="text-2xl font-bold text-slate-800">{analysis.stats.picking.totalVolume.toLocaleString()}</div>
                                {report.hasBenchmark && (
                                    <div className="text-xs font-medium mt-1 flex items-center gap-1">
                                        <span className="text-slate-400">vs {benchmarkAnalysis?.stats.picking.totalVolume.toLocaleString()}</span>
                                        {(() => {
                                            const delta = getDelta(analysis.stats.picking.totalVolume, benchmarkAnalysis!.stats.picking.totalVolume);
                                            return (
                                                <span className={`${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'} flex items-center`}>
                                                    {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {Math.abs(delta).toFixed(2)}%
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-semibold">Efficiency</div>
                                <div className="text-2xl font-bold text-blue-600">{analysis.stats.picking.uph} <span className="text-sm font-medium text-slate-400">UPH</span></div>
                                {report.hasBenchmark && (
                                    <div className="text-xs font-medium mt-1 flex items-center gap-1">
                                        <span className="text-slate-400">vs {benchmarkAnalysis?.stats.picking.uph}</span>
                                        <span className={`${report.pickUphDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'} flex items-center`}>
                                            {report.pickUphDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {Math.abs(report.pickUphDelta).toFixed(2)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Packing Column */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-fuchsia-500" />
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold text-slate-700">Packing Operations</h4>
                        {report.hasBenchmark && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                                ${report.packUphDelta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                            `}>
                                {report.packUphDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(report.packUphDelta).toFixed(2)}% vs Bmk
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-600 leading-relaxed">
                            {report.packingNarrative.map((text, i) => (
                                <span key={i} dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') + ' ' }} />
                            ))}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-semibold">Utilization</div>
                                <div className={`text-2xl font-bold ${analysis.stats.packing.utilization < 70 ? 'text-amber-500' : 'text-slate-800'}`}>
                                    {analysis.stats.packing.utilization}%
                                </div>
                                {report.hasBenchmark && (
                                    <div className="text-xs font-medium mt-1 flex items-center gap-1">
                                        <span className="text-slate-400">vs {benchmarkAnalysis?.stats.packing.utilization}%</span>
                                        {(() => {
                                            const delta = analysis.stats.packing.utilization - benchmarkAnalysis!.stats.packing.utilization;
                                            return (
                                                <span className={`${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'} flex items-center`}>
                                                    {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {Math.abs(delta).toFixed(2)}%
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-semibold">Throughput</div>
                                <div className="text-2xl font-bold text-fuchsia-600">{analysis.stats.packing.uph} <span className="text-sm font-medium text-slate-400">UPH</span></div>
                                {report.hasBenchmark && (
                                    <div className="text-xs font-medium mt-1 flex items-center gap-1">
                                        <span className="text-slate-400">vs {benchmarkAnalysis?.stats.packing.uph}</span>
                                        <span className={`${report.packUphDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'} flex items-center`}>
                                            {report.packUphDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {Math.abs(report.packUphDelta).toFixed(2)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
