import { useState, useMemo } from 'react';
import { type JobCodeStats } from '../types';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Bot } from 'lucide-react';
import { RichTooltip } from './rich-tooltip';
import { METRIC_TOOLTIPS } from '../logic/metric-definitions';

interface JobBreakdownViewProps {
    stats: JobCodeStats[];
}

type SortField = keyof JobCodeStats;
type SortDirection = 'asc' | 'desc';

export function JobBreakdownView({ stats }: JobBreakdownViewProps) {
    // --- State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [jobTypeFilter, setJobTypeFilter] = useState<string>('ALL');
    const [aiFilter, setAiFilter] = useState<'ALL' | 'AI' | 'MANUAL'>('ALL');

    // Numeric Filters
    const [minOrders, setMinOrders] = useState<string>('');
    const [maxOrders, setMaxOrders] = useState<string>('');

    const [sortField, setSortField] = useState<SortField>('totalUnits');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // --- Derived Data ---
    const uniqueJobTypes = useMemo(() => {
        const types = new Set(stats.map(s => s.jobType));
        return ['ALL', ...Array.from(types).sort()];
    }, [stats]);

    const filteredAndSortedStats = useMemo(() => {
        let filtered = stats;

        // 1. Text Search (Job Code)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(s => s.jobCode.toLowerCase().includes(lowerTerm));
        }

        // 2. Job Type
        if (jobTypeFilter !== 'ALL') {
            filtered = filtered.filter(s => s.jobType === jobTypeFilter);
        }

        // 3. AI Status
        if (aiFilter === 'AI') {
            filtered = filtered.filter(s => s.isAI);
        } else if (aiFilter === 'MANUAL') {
            filtered = filtered.filter(s => !s.isAI);
        }

        // 4. Numeric Ranges (Orders)
        if (minOrders !== '') {
            filtered = filtered.filter(s => s.totalOrders >= Number(minOrders));
        }
        if (maxOrders !== '') {
            filtered = filtered.filter(s => s.totalOrders <= Number(maxOrders));
        }

        // 5. Sort
        return [...filtered].sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];

            // Boolean Sort (AI)
            if (typeof valA === 'boolean' && typeof valB === 'boolean') {
                return sortDirection === 'asc'
                    ? (Number(valA) - Number(valB))
                    : (Number(valB) - Number(valA));
            }

            // String Sort
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            // Number Sort
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            return 0;
        });
    }, [stats, searchTerm, jobTypeFilter, aiFilter, minOrders, maxOrders, sortField, sortDirection]);

    // --- Handlers ---
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setJobTypeFilter('ALL');
        setAiFilter('ALL');
        setMinOrders('');
        setMaxOrders('');
        setSortField('totalUnits');
        setSortDirection('desc');
    };

    const activeFilterCount = [
        searchTerm !== '',
        jobTypeFilter !== 'ALL',
        aiFilter !== 'ALL',
        minOrders !== '',
        maxOrders !== ''
    ].filter(Boolean).length;

    // --- Components ---
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-50" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-3 h-3 text-blue-600" />
            : <ArrowDown className="w-3 h-3 text-blue-600" />;
    };



    // ... (existing imports)

    // ... (existing code)

    const Th = ({ field, label, align = 'left', width, tooltip }: { field: SortField | 'ai', label: string, align?: 'left' | 'right' | 'center', width?: string, tooltip?: React.ReactNode }) => (
        <th
            className={`px-4 py-3 bg-white/85 backdrop-blur-xl border-b border-white/50 cursor-pointer hover:bg-white/95 transition-colors group select-none sticky top-0 z-20 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
            style={{ width }}
            onClick={() => field !== 'ai' ? handleSort(field as SortField) : handleSort('isAI')}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
                <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-600 uppercase tracking-wider">{label}</span>
                    {tooltip && <RichTooltip content={tooltip} />}
                </div>
                <SortIcon field={field === 'ai' ? 'isAI' : field as SortField} />
            </div>
        </th>
    );

    return (
        <div className="flex flex-col h-full bg-transparent p-0 space-y-4">
            {/* Header Area */}
            {/* ... */}

            {/* Data Grid */}
            <div className="flex-1 bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        {/* 1. Header Row */}
                        <thead>
                            <tr>
                                <Th field="jobCode" label="Job Code" tooltip={METRIC_TOOLTIPS.COL_JOB_CODE} />
                                <Th field="jobType" label="Type" tooltip={METRIC_TOOLTIPS.COL_JOB_TYPE} />
                                <Th field="ai" label="Source" align="center" width="80px" tooltip={METRIC_TOOLTIPS.COL_SOURCE} />
                                <Th field="totalOrders" label="Orders" align="right" tooltip={METRIC_TOOLTIPS.COL_ORDERS} />
                                <Th field="totalLocations" label="Locs" align="right" tooltip={METRIC_TOOLTIPS.COL_LOCATIONS} />
                                <Th field="totalSkus" label="SKUs" align="right" tooltip={METRIC_TOOLTIPS.COL_SKUS} />
                                <Th field="totalUnits" label="Units" align="right" tooltip={METRIC_TOOLTIPS.COL_UNITS} />
                            </tr>

                            {/* 2. Filter Row - Manually Sticky below Header */}
                            <tr className="border-b border-white/40 bg-white/70">
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search code..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-7 pr-2 py-1.5 text-xs text-slate-700 bg-white/50 border border-white/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400"
                                        />
                                    </div>
                                </td>
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40">
                                    <select
                                        value={jobTypeFilter}
                                        onChange={(e) => setJobTypeFilter(e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs text-slate-700 bg-white/50 border border-white/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                                    >
                                        {uniqueJobTypes.map(type => (
                                            <option key={type} value={type}>{type === 'ALL' ? 'All Types' : type}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40">
                                    <select
                                        value={aiFilter}
                                        onChange={(e) => setAiFilter(e.target.value as any)}
                                        className="w-full py-1.5 px-1 text-xs text-slate-700 bg-white/50 border border-white/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-center"
                                    >
                                        <option value="ALL">All Sources</option>
                                        <option value="AI">AI Only</option>
                                        <option value="MANUAL">Human</option>
                                    </select>
                                </td>
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40">
                                    <div className="flex items-center gap-1 justify-end">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            className="w-14 py-1.5 px-1 text-xs text-slate-700 bg-white/50 border border-white/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-right placeholder:text-slate-400"
                                            value={minOrders} onChange={(e) => setMinOrders(e.target.value)}
                                        />
                                        <span className="text-slate-400 font-light">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            className="w-14 py-1.5 px-1 text-xs text-slate-700 bg-white/50 border border-white/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-right placeholder:text-slate-400"
                                            value={maxOrders} onChange={(e) => setMaxOrders(e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40 text-right text-xs text-slate-300 select-none">-</td>
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40 text-right text-xs text-slate-300 select-none">-</td>
                                <td className="p-2 sticky top-[45px] z-10 bg-white/75 backdrop-blur-xl border-b border-white/40 text-right text-xs text-slate-300 select-none">-</td>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/30 bg-transparent">
                            {filteredAndSortedStats.map((stat) => (
                                <tr key={stat.jobCode} className="hover:bg-white/40 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-slate-900 font-mono text-xs border-r border-transparent hover:border-white/50">
                                        {stat.jobCode}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${stat.jobType.toLowerCase().includes('pick') ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                            stat.jobType.toLowerCase().includes('pack') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                'bg-white/40 text-slate-600 border-white/50'
                                            }`}>
                                            {stat.jobType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {stat.isAI ? (
                                            <div className="flex justify-center">
                                                <div className="p-1 rounded bg-purple-100 text-purple-600 ring-2 ring-white shadow-sm" title="AI Generated">
                                                    <Bot className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-medium">MAN</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{stat.totalOrders.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{stat.totalLocations.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{stat.totalSkus.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums bg-white/20">
                                        {stat.totalUnits.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredAndSortedStats.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic bg-white/20">
                                        <div className="flex flex-col items-center gap-2">
                                            <Filter className="w-8 h-8 text-slate-200" />
                                            <p>No jobs found.</p>
                                            <button onClick={clearFilters} className="text-blue-600 hover:underline text-xs mt-1">Clear filters</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer / Count */}
                <div className="bg-white/30 backdrop-blur-md px-4 py-2 border-t border-white/50 text-xs text-slate-500 flex justify-between items-center z-20 relative">
                    <span className="font-medium">
                        Showing <span className="text-slate-900">{filteredAndSortedStats.length}</span> results
                    </span>
                    <span className="text-slate-400">
                        Sorted by <span className="text-slate-600 font-medium">{sortField}</span> ({sortDirection})
                    </span>
                </div>
            </div>
        </div>
    );
}
