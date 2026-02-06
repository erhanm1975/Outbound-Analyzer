import { type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import React from 'react';
import { RichTooltip } from './rich-tooltip';

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
    tooltip?: React.ReactNode;
    className?: string;
    colorClass?: string; // e.g. "from-blue-500 to-indigo-600"
    onClick?: () => void;
    suffix?: string;
}

export function MetricCard({ title, value, subValue, icon, trend, benchmarkValue, tooltip, className, colorClass = "from-slate-500 to-slate-700", onClick, suffix }: MetricCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] group transition-all duration-300 hover:z-50",
                onClick ? "cursor-pointer hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.2)] hover:-translate-y-1 active:scale-[0.98]" : "hover:-translate-y-1",
                className
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white shadow-lg shadow-black/10`}>
                    {icon}
                </div>

                {tooltip && (
                    <div className="relative z-[60]">
                        <RichTooltip content={tooltip} />
                    </div>
                )}
            </div>

            <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>

            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">{value}</span>
                {suffix && <span className="text-sm font-medium text-slate-500 mb-1">{suffix}</span>}
                {subValue && <span className="text-xs text-slate-400 font-medium ml-1">{subValue}</span>}
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
