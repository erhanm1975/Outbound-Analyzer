import { ShoppingCart, Truck, Package } from 'lucide-react';

interface TaskFlowVisualProps {
    pickTime: number;
    travelTime: number;
    packTime: number;
}

export function TaskFlowVisual({ pickTime, travelTime, packTime }: TaskFlowVisualProps) {
    const total = pickTime + travelTime + packTime;

    return (
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-slate-800">Task Performance</h3>
                <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600 font-medium">Avg Duration</span>
            </div>

            {/* Connected Cards Row */}
            <div className="relative flex justify-between items-center px-2 py-6">
                {/* Connecting Gradient Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 via-amber-300 to-purple-300 -z-10 rounded-full opacity-50"></div>

                {/* Pick */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 border-blue-200 shadow-lg bg-blue-50/80 backdrop-blur-sm transition-transform hover:scale-105">
                        <ShoppingCart className="w-5 h-5 text-blue-500 mb-1" />
                        <span className="text-[10px] font-bold text-blue-600">{pickTime.toFixed(1)}s</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Pick</span>
                </div>

                {/* Travel */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 border-amber-200 shadow-lg bg-amber-50/80 backdrop-blur-sm transition-transform hover:scale-105">
                        <Truck className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-[10px] font-bold text-amber-600">{travelTime.toFixed(1)}s</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Travel</span>
                </div>

                {/* Pack */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 border-purple-200 shadow-lg bg-purple-50/80 backdrop-blur-sm transition-transform hover:scale-105">
                        <Package className="w-5 h-5 text-purple-500 mb-1" />
                        <span className="text-[10px] font-bold text-purple-600">{packTime.toFixed(1)}s</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Pack</span>
                </div>
            </div>

            {/* Total Duration Bar */}
            <div className="mt-8 p-4 bg-white/40 rounded-xl border border-white/50">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">Average Time per Task</span>
                    <span className="font-bold text-slate-800">{total.toFixed(1)}s</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    {/* Visual bar gradient */}
                    <div className="bg-gradient-to-r from-blue-400 via-amber-400 to-purple-500 h-full w-[75%] rounded-full opacity-80"></div>
                </div>
            </div>
        </div>
    );
}
