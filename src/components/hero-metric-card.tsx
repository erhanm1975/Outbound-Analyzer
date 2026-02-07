import { type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';

interface HeroMetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon?: ReactNode;
    trend?: {
        value: number; // percentage
        isPositiveGood: boolean;
    };
    benchmarkValue?: string | number;
    tooltip?: React.ReactNode;
    className?: string;
    colorClass?: string; // e.g. "from-blue-500 to-indigo-600"
    onClick?: () => void;
    suffix?: string;
}

export function HeroMetricCard({ title, value, subValue, icon, trend, benchmarkValue, tooltip, className, colorClass = "from-slate-500 to-slate-700", onClick, suffix }: HeroMetricCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-3xl overflow-hidden group transition-all duration-300 hover:z-50",
                onClick ? "cursor-pointer active:scale-[0.99]" : "",
                className
            )}
        >
            {/* Background with Gradient Mesh */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-15 transition-opacity duration-500", colorClass)} />

            {/* Glass Container */}
            <div className="relative h-full border border-white/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-none group-hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.2)] dark:hover:bg-slate-800/60 transition-all duration-300">

                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white shadow-lg shadow-black/10`}>
                            {icon}
                        </div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-lg font-semibold tracking-wide">{title}</h3>
                    </div>

                    {tooltip && (
                        <div className="group/tooltip relative bg-white/50 dark:bg-slate-700/50 p-2 rounded-full cursor-help hover:bg-white/80 dark:hover:bg-slate-600/80 transition-colors">
                            <Info className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800/95 text-white text-xs rounded-xl shadow-xl backdrop-blur-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none text-center leading-relaxed border border-white/10">
                                {tooltip}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-900 dark:from-white dark:to-slate-300">
                            {value}
                        </span>
                        {suffix && <span className="text-xl font-bold text-slate-500 dark:text-slate-400">{suffix}</span>}
                    </div>
                    {subValue && <span className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1 pl-1">{subValue}</span>}
                </div>

                {/* Trend Footer */}
                <div className="mt-6 pt-4 border-t border-slate-200/50 flex items-center justify-between">
                    {trend ? (
                        <div className="flex items-center gap-2">
                            {trend.value > 0 ? (
                                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-white/50", trend.isPositiveGood ? "text-emerald-600 bg-emerald-50/50" : "text-rose-600 bg-rose-50/50")}>
                                    <ArrowUpRight className="w-4 h-4" />
                                    {Math.abs(trend.value)}%
                                </div>
                            ) : trend.value < 0 ? (
                                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-white/50", !trend.isPositiveGood ? "text-emerald-600 bg-emerald-50/50" : "text-rose-600 bg-rose-50/50")}>
                                    <ArrowDownRight className="w-4 h-4" />
                                    {Math.abs(trend.value)}%
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                                    <Minus className="w-4 h-4" />
                                    0%
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-8"></div> // Spacer
                    )}

                    {benchmarkValue && (
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest ">
                            vs {benchmarkValue}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
