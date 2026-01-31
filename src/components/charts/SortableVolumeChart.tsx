
import { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ChartRecord {
    id: string; // unique key (jobType or waveCode)
    label: string; // display name
    volume: number; // main bar metric
    metric1: number; // avg orders
    metric2: number; // avg units
}

interface SortableVolumeChartProps {
    title: string;
    subtitle: string;
    data: ChartRecord[];
    labels: {
        item: string; // "Job Type" or "Wave No"
        volume: string; // "Volume"
        metric1: string; // "Avg Orders"
        metric2: string; // "Avg Units"
    };
    efficiencyScore?: number;
    colorScheme: 'default' | 'cyan'; // 'default' for Job, 'cyan' for Wave
    pageSize?: number;
}

type SortConfig = {
    key: keyof ChartRecord;
    direction: 'asc' | 'desc';
};

export function SortableVolumeChart({
    title,
    subtitle,
    data,
    labels,
    efficiencyScore,
    colorScheme = 'default',
    pageSize = 10 // Default to 10
}: SortableVolumeChartProps) {
    const [page, setPage] = useState(0);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'volume', direction: 'desc' });

    // Sorting Logic
    const sortedData = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortConfig.direction === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            return 0;
        });
        return sorted;
    }, [data, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
    const maxVal = Math.max(...data.map(d => d.volume), 1); // Max global volume for relative bars

    // Styles
    const gradients = colorScheme === 'default' ? [
        'from-emerald-400 to-teal-500',
        'from-blue-400 to-indigo-500',
        'from-purple-400 to-fuchsia-500',
        'from-amber-400 to-orange-500',
        'from-rose-400 to-pink-500'
    ] : [
        'from-cyan-400 to-blue-500',
        'from-violet-400 to-purple-500',
        'from-fuchsia-400 to-pink-500',
        'from-emerald-400 to-green-500',
        'from-amber-400 to-orange-500'
    ];

    const shadows = colorScheme === 'default' ? [
        'shadow-[0_0_15px_rgba(52,211,153,0.6)] group-hover:shadow-[0_0_25px_rgba(52,211,153,0.8)]',
        'shadow-[0_0_15px_rgba(99,102,241,0.6)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.8)]',
        'shadow-[0_0_15px_rgba(192,132,252,0.6)] group-hover:shadow-[0_0_25px_rgba(192,132,252,0.8)]',
        'shadow-[0_0_15px_rgba(251,191,36,0.6)] group-hover:shadow-[0_0_25px_rgba(251,191,36,0.8)]',
        'shadow-[0_0_15px_rgba(251,113,133,0.6)] group-hover:shadow-[0_0_25px_rgba(251,113,133,0.8)]'
    ] : [
        'shadow-[0_0_15px_rgba(34,211,238,0.6)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.8)]',
        'shadow-[0_0_15px_rgba(139,92,246,0.6)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.8)]',
        'shadow-[0_0_15px_rgba(232,121,249,0.6)] group-hover:shadow-[0_0_25px_rgba(232,121,249,0.8)]',
        'shadow-[0_0_15px_rgba(52,211,153,0.6)] group-hover:shadow-[0_0_25px_rgba(52,211,153,0.8)]',
        'shadow-[0_0_15px_rgba(251,191,36,0.6)] group-hover:shadow-[0_0_25px_rgba(251,191,36,0.8)]'
    ];

    const handleSort = (key: keyof ChartRecord) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
        setPage(0); // Reset to first page on sort
    };

    const SortIcon = ({ colKey }: { colKey: keyof ChartRecord }) => {
        if (sortConfig.key !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 text-blue-500" />
            : <ArrowDown className="w-3 h-3 text-blue-500" />;
    };

    const HeaderCell = ({ label, colKey, align = 'left', className = '' }: { label: string, colKey: keyof ChartRecord, align?: 'left' | 'right', className?: string }) => (
        <div
            className={cn(
                "cursor-pointer flex items-center gap-1 hover:text-slate-600 transition-colors select-none",
                align === 'right' && "justify-end",
                className
            )}
            onClick={() => handleSort(colKey)}
        >
            {label}
            <SortIcon colKey={colKey} />
        </div>
    );

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col h-full">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
                {efficiencyScore !== undefined && (
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Efficiency Score</p>
                        <p className="text-3xl font-bold text-emerald-500 drop-shadow-sm">{efficiencyScore}%</p>
                    </div>
                )}
            </div>

            {/* Header Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-3 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:grid shrink-0">
                <div className="md:col-span-3">
                    <HeaderCell label={labels.item} colKey="label" />
                </div>
                <div className="md:col-span-5 pr-4">
                    <HeaderCell label={labels.volume} colKey="volume" align="right" />
                </div>
                <div className="md:col-span-2">
                    <HeaderCell label={labels.metric1} colKey="metric1" align="right" />
                </div>
                <div className="md:col-span-2">
                    <HeaderCell label={labels.metric2} colKey="metric2" align="right" />
                </div>
            </div>

            <div className="space-y-4 flex-1">
                {paginatedData.map((d, i) => {
                    const widthPct = (d.volume / maxVal) * 100;
                    const gradient = gradients[i % gradients.length];
                    const shadow = shadows[i % shadows.length];

                    return (
                        <div key={d.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center group bg-white/30 rounded-xl p-2 hover:bg-white/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="md:col-span-3 text-sm font-medium text-slate-700 truncate" title={d.label}>
                                {d.label}
                            </div>

                            {/* Bar Chart Column */}
                            <div className="md:col-span-5 relative h-8 bg-slate-100/50 rounded-full overflow-visible shadow-inner">
                                <div
                                    className={cn(
                                        "absolute top-0 left-0 h-full rounded-full bg-gradient-to-r flex items-center justify-end px-3 transition-all duration-500",
                                        gradient,
                                        shadow
                                    )}
                                    style={{ width: `${Math.max(widthPct, 20)}%` }}
                                    title={`Volume: ${d.volume.toLocaleString()}`}
                                >
                                    <span className="text-white text-xs font-bold drop-shadow-md whitespace-nowrap">
                                        {d.volume.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="md:col-span-2 text-right">
                                <div className="text-sm font-bold text-slate-700">{d.metric1.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">{labels.metric1}</div>
                            </div>
                            <div className="md:col-span-2 text-right">
                                <div className="text-sm font-bold text-slate-700">{d.metric2.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">{labels.metric2}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer with Pagination */}
            <div className="mt-8 flex justify-between items-center text-xs text-slate-500 px-2 shrink-0 border-t border-slate-200/50 pt-4">
                <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]", colorScheme === 'cyan' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]')}></span>
                    <span>{totalPages > 1 ? `Page ${page + 1} of ${totalPages}` : 'Real-Time Metrics Active'}</span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-slate-600 tabular-nums">
                            {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="p-1 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
