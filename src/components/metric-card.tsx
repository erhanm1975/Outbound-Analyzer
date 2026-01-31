import { type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon?: ReactNode;
    trend?: {
        value: number; // percentage
        isPositiveGood: boolean;
    };
    benchmarkValue?: string | number;
    tooltip?: string;
    className?: string;
    colorClass?: string; // e.g. "from-blue-500 to-indigo-600"
    onClick?: () => void;
}

export function MetricCard({ title, value, subValue, icon, trend, benchmarkValue, tooltip, className, colorClass = "from-slate-500 to-slate-700", onClick }: MetricCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] group transition-all duration-300",
                onClick ? "cursor-pointer hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.2)] hover:-translate-y-1 active:scale-[0.98]" : "hover:-translate-y-1",
                className
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white shadow-lg shadow-black/10`}>
                    {icon}
                </div>

                {tooltip && (
                    <div className="group/tooltip relative bg-white/50 p-1.5 rounded-full cursor-help hover:bg-white/80 transition-colors">
                        <Info className="w-4 h-4 text-slate-500" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800/95 text-white text-xs rounded-xl shadow-xl backdrop-blur-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none text-center leading-relaxed border border-white/10">
                            {tooltip}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95"></div>
                        </div>
                    </div>
                )}
            </div>

            <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>

            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">{value}</span>
                {subValue && <span className="text-xs text-slate-400 font-medium">{subValue}</span>}
            </div>

            {trend && (
                <div className="flex items-center gap-2 text-xs font-medium mt-3">
                    {trend.value > 0 ? (
                        <div className={cn("flex items-center gap-1", trend.isPositiveGood ? "text-emerald-600" : "text-rose-600")}>
                            <ArrowUpRight className="w-3 h-3" />
                            {Math.abs(trend.value)}%
                        </div>
                    ) : trend.value < 0 ? (
                        <div className={cn("flex items-center gap-1", !trend.isPositiveGood ? "text-emerald-600" : "text-rose-600")}>
                            <ArrowDownRight className="w-3 h-3" />
                            {Math.abs(trend.value)}%
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                            <Minus className="w-3 h-3" />
                            0%
                        </div>
                    )}
                    <span className="text-slate-400">
                        {benchmarkValue ? `vs ${benchmarkValue}` : 'vs benchmark'}
                    </span>
                </div>
            )}
        </div>
    );
}
