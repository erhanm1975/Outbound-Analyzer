
interface WorkforceChartProps {
    pickers: number;
    packers: number;
    crossTrained: number;
}

export function WorkforceChart({ pickers, packers, crossTrained }: WorkforceChartProps) {
    const pickersOnly = Math.max(0, pickers - crossTrained);
    const packersOnly = Math.max(0, packers - crossTrained);

    return (
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Workforce</h3>

            <div className="flex flex-col h-full pb-4">
                {/* Visual Art Stack */}
                <div className="flex-1 flex flex-col justify-end gap-1 w-20 mx-auto relative group min-h-[120px]">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 -right-24 bg-white shadow-lg p-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none w-32 border border-slate-100">
                        <p className="font-bold text-slate-700">Composition</p>
                        <p className="text-slate-500">Pickers: {pickers}</p>
                        <p className="text-slate-500">Packers: {packers}</p>
                    </div>

                    <div className="h-20 w-full rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 opacity-90 backdrop-blur-md shadow-lg border border-white/30"></div>
                    <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 opacity-90 backdrop-blur-md shadow-lg border border-white/30 -mt-2 z-10 scale-x-110 transform"></div>
                </div>

                {/* List Breakdown */}
                <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                            <span className="text-slate-600">Cross-Trained</span>
                        </div>
                        <span className="font-bold text-slate-800">{crossTrained}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                            <span className="text-slate-600">Packers Only</span>
                        </div>
                        <span className="font-bold text-slate-800">{packersOnly}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-slate-600">Pickers Only</span>
                        </div>
                        <span className="font-bold text-slate-800">{pickersOnly}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
