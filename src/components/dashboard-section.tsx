import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface DashboardSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
    color?: string; // e.g. "bg-blue-500"
    className?: string;
}

export function DashboardSection({ title, description, children, color = "bg-slate-500", className }: DashboardSectionProps) {
    return (
        <section className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn("h-4 w-1 rounded-full", color)}></div>
                    <div>
                        <h3 className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">{title}</h3>
                        {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {children}
        </section>
    );
}
