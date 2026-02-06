import { ShoppingCart, Truck, Package, Layers, Hourglass } from 'lucide-react';
import { RichTooltip } from '../rich-tooltip';

interface TaskFlowVisualProps {
    interJobTime?: number;
    pickTime: number;
    travelTime: number;
    sortTime?: number;
    packTime: number;
    benchmarkInterJobTime?: number;
    benchmarkPickTime?: number;
    benchmarkTravelTime?: number;
    benchmarkSortTime?: number;
    benchmarkPackTime?: number;
    onClick?: () => void;
    onForensicsClick?: () => void; // New
    tooltips?: {
        interJob?: React.ReactNode;
        pick?: React.ReactNode;
        travel?: React.ReactNode;
        sort?: React.ReactNode;
        pack?: React.ReactNode;
    };
}

export function TaskFlowVisual({
    interJobTime,
    pickTime,
    travelTime,
    sortTime,
    packTime,
    benchmarkInterJobTime,
    benchmarkPickTime,
    benchmarkTravelTime,
    benchmarkSortTime,
    benchmarkPackTime,
    onClick,
    onForensicsClick,
    tooltips
}: TaskFlowVisualProps) {
    // Total is purely Process + Travel + Sort + Pack (Task Execution)
    // Inter-Job is usually considered "overhead" separate from cycle time, but part of "Workday"
    // For this visual, we sum the displayed active components.
    const total = pickTime + travelTime + (sortTime || 0) + (packTime || 0);
    const benchmarkTotal = (benchmarkPickTime || 0) + (benchmarkTravelTime || 0) + (benchmarkSortTime || 0) + (benchmarkPackTime || 0);
    const hasBenchmark = benchmarkPickTime !== undefined;

    const formatTime = (val: number) => val > 60 ? `${(val / 60).toFixed(2)}m` : `${val.toFixed(2)}s`;

    const renderMetricBox = (
        title: string,
        value: number | undefined,
        benchmarkValue: number | undefined,
        Icon: any,
        colorBase: 'blue' | 'amber' | 'purple' | 'cyan' | 'slate',
        isNA: boolean = false,
        tooltip?: React.ReactNode
    ) => {
        const colorClasses = {
            blue: { border: 'border-blue-200', bg: 'bg-blue-50/80', text: 'text-blue-600', icon: 'text-blue-500' },
            amber: { border: 'border-amber-200', bg: 'bg-amber-50/80', text: 'text-amber-600', icon: 'text-amber-500' },
            cyan: { border: 'border-cyan-200', bg: 'bg-cyan-50/80', text: 'text-cyan-600', icon: 'text-cyan-500' },
            purple: { border: 'border-purple-200', bg: 'bg-purple-50/80', text: 'text-purple-600', icon: 'text-purple-500' },
            slate: { border: 'border-slate-200', bg: 'bg-slate-50/80', text: 'text-slate-600', icon: 'text-slate-500' }
        };
        const colors = colorClasses[colorBase];
        const displayVal = value ?? 0;

        const delta = benchmarkValue ? displayVal - benchmarkValue : 0;
        const isFaster = delta < 0; // Lower time is better
        const pctDiff = benchmarkValue ? ((delta / benchmarkValue) * 100).toFixed(1) : '0';

        return (
            <div className="flex flex-col items-center gap-3 z-10">
                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 ${colors.border} shadow-lg ${colors.bg} backdrop-blur-sm transition-transform hover:scale-105 relative group`}>
                    <Icon className={`w-5 h-5 ${colors.icon} mb-1`} />
                    <span className={`text-[10px] font-bold ${colors.text}`}>
                        {isNA ? 'N/A' : formatTime(displayVal)}
                    </span>

                    {/* Benchmark Indicator Badge */}
                    {!isNA && benchmarkValue !== undefined && Math.abs(delta) > 0.01 && (
                        <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold border shadow-sm ${isFaster ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'
                            }`}>
                            {isFaster ? '' : '+'}{pctDiff}%
                        </div>
                    )}

                    {/* Tooltip */}
                    {tooltip && (
                        <RichTooltip
                            content={tooltip}
                            className="absolute top-1 right-1 z-50"
                            trigger={
                                <div className="p-1 rounded-full hover:bg-white/50 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3 h-3 ${colors.icon} opacity-50 hover:opacity-100`}>
                                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                                    </svg>
                                </div>
                            }
                        />
                    )}
                </div>
                <span className="text-xs font-medium text-slate-500">{title}</span>
            </div >
        );
    };

    return (
        <div
            className={`lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] ${onClick ? 'cursor-pointer transition-all hover:shadow-md hover:border-blue-300' : ''}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-slate-800">Task Performance Breakdown</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 italic hidden sm:inline">
                        *Picking GSPT-based split
                    </span>
                    {onForensicsClick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onForensicsClick();
                            }}
                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded font-medium transition-colors cursor-pointer"
                        >
                            Forensics
                        </button>
                    )}
                    <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600 font-medium">Avg per Task</span>
                </div>
            </div>

            {/* Connected Cards Row */}
            <div className="relative flex justify-between items-center px-1 py-6 gap-2">
                {/* Connecting Gradient Line */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-slate-300 via-amber-300 via-cyan-300 to-purple-300 -z-0 rounded-full opacity-50"></div>

                {renderMetricBox('Inter-Job', interJobTime, benchmarkInterJobTime, Hourglass, 'slate', interJobTime === undefined, tooltips?.interJob)}
                {renderMetricBox('Travel', travelTime, benchmarkTravelTime, Truck, 'amber', false, tooltips?.travel)}
                {renderMetricBox('Picking', pickTime, benchmarkPickTime, ShoppingCart, 'blue', false, tooltips?.pick)}
                {renderMetricBox('Sorting', sortTime, benchmarkSortTime, Layers, 'cyan', sortTime === undefined || sortTime === 0, tooltips?.sort)}
                {renderMetricBox('Packing', packTime, benchmarkPackTime, Package, 'purple', packTime === undefined || packTime === 0, tooltips?.pack)}
            </div>

            {/* Total Duration Bar */}
            <div className="mt-8 p-4 bg-white/40 rounded-xl border border-white/50">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">Average Time per Task</span>
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-800">{formatTime(total)}</span>
                        {hasBenchmark && (
                            <span className="text-[10px] text-slate-400">
                                vs {formatTime(benchmarkTotal)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex relative">
                    {/* Visual bar gradient */}
                    <div className="bg-gradient-to-r from-blue-400 via-amber-400 via-cyan-400 to-purple-500 h-full w-[75%] rounded-full opacity-80"></div>
                </div>
            </div>
        </div>
    );
}
