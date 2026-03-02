
interface WorkforceChartProps {
    pickers: number;
    packers: number;
    crossTrained: number;
}

export function WorkforceChart({ pickers, packers, crossTrained }: WorkforceChartProps) {
    const pickersOnly = Math.max(0, pickers - crossTrained);
    const packersOnly = Math.max(0, packers - crossTrained);

    return (
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-md p-6 shadow-none flex flex-col h-full group hover:-translate-y-1 transition-transform duration-300">
            <h3 className="text-lg font-bold text-slate-100 mb-6">Workforce</h3>

            <div className="flex flex-col h-full pb-4">
                {/* Visual Art Stack */}
                <div className="flex-1 flex flex-col justify-end gap-1 w-20 mx-auto relative group min-h-[120px]">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 -right-24 bg-slate-800 shadow-xl p-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none w-32 border border-slate-700">
                        <p className="font-bold text-slate-200">Composition</p>
                        <p className="text-slate-400">Pickers: {pickers}</p>
                        <p className="text-slate-400">Packers: {packers}</p>
                    </div>

                    <div className="h-20 w-full rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 opacity-90 backdrop-blur-md shadow-lg border border-white/30"></div>
                    <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 opacity-90 backdrop-blur-md shadow-lg border border-white/30 -mt-2 z-10 scale-x-110 transform"></div>
                </div>

                {/* List Breakdown */}
                <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"></span>
                            <span className="text-slate-400">Cross-Trained</span>
                        </div>
                        <span className="font-bold text-slate-200">{crossTrained}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]"></span>
                            <span className="text-slate-400">Packers Only</span>
                        </div>
                        <span className="font-bold text-slate-200">{packersOnly}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                            <span className="text-slate-400">Pickers Only</span>
                        </div>
                        <span className="font-bold text-slate-200">{pickersOnly}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
