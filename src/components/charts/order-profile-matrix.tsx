import React from 'react';

interface OrderProfileMatrixProps {
    xLabels: string[];
    yLabels: string[];
    matrix: number[][];
    maxCount: number;
}

export function OrderProfileMatrix({ xLabels, yLabels, matrix, maxCount }: OrderProfileMatrixProps) {
    if (maxCount === 0) return null;

    return (
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">grid_on</span>
                    Order Profile Matrix
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Heatmap comparing Distinct SKUs per order against Total Units per order. Darker cells indicate higher order volume.
                </p>
            </div>

            <div className="overflow-x-auto select-none">
                <div className="min-w-[600px] py-4">
                    <div className="flex">
                        {/* Y-Axis Label Area vertically centered */}
                        <div className="w-12 flex flex-col justify-center items-center">
                            <div className="transform -rotate-90 whitespace-nowrap text-xs font-bold text-slate-400 tracking-widest origin-center translate-y-[-2rem]">
                                DISTINCT SKUS
                            </div>
                        </div>

                        <div className="flex-1">
                            {/* Grid Rows (Rendered bottom up: index 5 to 0) */}
                            {[5, 4, 3, 2, 1, 0].map(yIdx => (
                                <div key={`row-${yIdx}`} className="flex items-center mb-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors pr-2">
                                    <div className="w-16 text-right pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {yLabels[yIdx]}
                                    </div>
                                    <div className="flex-1 grid grid-cols-6 gap-1.5">
                                        {xLabels.map((_, xIdx) => {
                                            const count = matrix[yIdx][xIdx];
                                            // Opacity curve: base 10%, max 100%
                                            let intensity = maxCount > 0
                                                ? Math.max(0.1, count / maxCount)
                                                : 0.1;

                                            // Apply logarithmic curve for better visibility of long tails
                                            if (count > 0 && intensity < 0.2) intensity = 0.2;

                                            return (
                                                <div
                                                    key={`cell-${xIdx}-${yIdx}`}
                                                    className="h-12 rounded relative group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md hover:ring-2 hover:ring-emerald-400/50"
                                                    style={{
                                                        backgroundColor: count > 0
                                                            ? `rgba(16, 185, 129, ${intensity})`
                                                            : 'rgba(148, 163, 184, 0.1)' // slate-400 at 10%
                                                    }}
                                                >
                                                    {/* Tooltip */}
                                                    {count > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48 p-3 bg-slate-800 text-slate-100 text-sm rounded-lg border border-slate-700 shadow-xl pointer-events-none">
                                                            <div className="font-bold text-white mb-2 text-base border-b border-slate-700 pb-1">{count.toLocaleString()} Orders</div>
                                                            <div className="flex justify-between mt-1"><span className="text-slate-400">SKUs:</span> <span>{yLabels[yIdx]}</span></div>
                                                            <div className="flex justify-between"><span className="text-slate-400">Units:</span> <span>{xLabels[xIdx]}</span></div>
                                                        </div>
                                                    )}
                                                    {/* Value Label inside cell */}
                                                    {count > 0 && (
                                                        <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${intensity > 0.4 ? 'text-white drop-shadow' : 'text-slate-700 dark:text-emerald-100'}`}>
                                                            {count > 9999 ? (count / 1000).toFixed(1) + 'k' : count}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* X-Axis Labels */}
                            <div className="flex mt-3 pr-2">
                                <div className="w-16"></div>
                                <div className="flex-1 grid grid-cols-6 gap-1.5">
                                    {xLabels.map((label, i) => (
                                        <div key={`x-${i}`} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* X-Axis Title */}
                            <div className="flex mt-4">
                                <div className="w-16"></div>
                                <div className="flex-1 text-center text-xs font-bold text-slate-400 tracking-widest">
                                    TOTAL UNITS PER ORDER
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
