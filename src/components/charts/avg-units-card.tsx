import { Package } from 'lucide-react';

interface AvgUnitsCardProps {
    totalUnits: number;
    totalOrders: number;
}

export function AvgUnitsCard({ totalUnits, totalOrders }: AvgUnitsCardProps) {
    const avgUnits = totalOrders > 0 ? (totalUnits / totalOrders).toFixed(1) : '0.0';

    return (
        <div className="lg:col-span-4 relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-md p-6 shadow-none flex flex-col h-full group hover:-translate-y-1 transition-transform duration-300">
            <h3 className="text-lg font-bold text-slate-100 mb-6">Order Density</h3>

            <div className="flex flex-col items-center justify-center flex-1 w-full relative pb-4">
                {/* Visual Art Elements */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-400/30 transition-colors duration-500"></div>
                </div>

                {/* Central Metric */}
                <div className="flex flex-col items-center justify-center z-10 pt-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] mb-4">
                        <Package className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <span className="text-5xl font-black text-white tracking-tighter drop-shadow-md">
                        {avgUnits}
                    </span>
                    <span className="text-sm font-semibold text-emerald-400 mt-2 tracking-widest uppercase">
                        Units / Order
                    </span>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-700/50 flex justify-between items-center z-10">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500 font-medium">Total Units</span>
                    <span className="text-sm text-slate-300 font-semibold">{totalUnits.toLocaleString()}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-500 font-medium">Total Orders</span>
                    <span className="text-sm text-slate-300 font-semibold">{totalOrders.toLocaleString()}</span>
                </div>
            </div>

            {/* Background Texture Graphic */}
            <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none rotate-12 scale-150">
                <Package className="w-64 h-64" strokeWidth={0.5} />
            </div>
        </div>
    );
}
