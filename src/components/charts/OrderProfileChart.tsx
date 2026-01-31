interface OrderProfileChartProps {
    single: number;
    multi: number;
    total: number;
}

export function OrderProfileChart({ single, multi, total }: OrderProfileChartProps) {
    // Calculate percentage
    const singlePct = total > 0 ? (single / total) * 100 : 0;
    const multiPct = total > 0 ? (multi / total) * 100 : 0;

    // We'll use Multi as the first segment, Single as the second (or vice versa).
    // Let's us Blue (#3b82f6) for Multi and Cyan (#22d3ee) for Single to match design.

    return (
        <div className="lg:col-span-4 relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Order Profile</h3>
                <div className="bg-white/50 p-1.5 rounded-lg">
                    {/* Filter Icon Placeholder */}
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4 flex-1">
                {/* Conic Gradient Circle */}
                <div
                    className="relative w-48 h-48 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-500 hover:shadow-[0_0_50px_rgba(59,130,246,0.5)]"
                    style={{
                        background: `conic-gradient(from 180deg, #3b82f6 0%, #3b82f6 ${multiPct}%, #22d3ee ${multiPct}%, #22d3ee 100%)`
                    }}
                >
                    {/* Inner White Circle for Donut Effect */}
                    <div className="absolute inset-4 bg-white/90 rounded-full flex flex-col items-center justify-center backdrop-blur-sm z-10">
                        <span className="text-3xl font-bold text-slate-800">{total.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Total Orders</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">Single-Item</span>
                        <span className="text-[10px] text-slate-400">{singlePct.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">Multi-Item</span>
                        <span className="text-[10px] text-slate-400">{multiPct.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
