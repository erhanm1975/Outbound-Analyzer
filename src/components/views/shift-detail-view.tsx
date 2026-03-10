import { type EnrichedShiftRecord } from '../../types';
import { Table, ArrowDown, ArrowUp, Search, Filter, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useHelp } from '../../contexts/help-context';
import { ShiftDetailsGuide } from '../guide/shift-details-guide';

interface ShiftDetailViewProps {
    data: EnrichedShiftRecord[];
}

export function ShiftDetailView({ data }: ShiftDetailViewProps) {
    const { openHelp } = useHelp();
    const [sortField, setSortField] = useState<keyof EnrichedShiftRecord>('Start');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);

    // Filters
    const [userFilter, setUserFilter] = useState('');
    const [jobCodeFilter, setJobCodeFilter] = useState('');
    const [jobTypeFilter, setJobTypeFilter] = useState('ALL');
    const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);

    const pageSize = 50;

    const uniqueJobTypes = useMemo(() => {
        return ['ALL', ...Array.from(new Set(data.map(d => d.JobType || 'Unknown'))).sort()];
    }, [data]);

    const handleSort = (field: keyof EnrichedShiftRecord) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(row => {
            if (userFilter && !row.User?.toLowerCase().includes(userFilter.toLowerCase())) return false;
            if (jobCodeFilter && !row.JobCode?.toLowerCase().includes(jobCodeFilter.toLowerCase())) return false;
            if (jobTypeFilter !== 'ALL' && row.JobType !== jobTypeFilter) return false;
            if (showAnomaliesOnly && !row.isAnomaly) return false;
            return true;
        });
    }, [data, userFilter, jobCodeFilter, jobTypeFilter, showAnomaliesOnly]);

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (aVal === undefined || bVal === undefined) return 0;

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortField, sortDir]);

    const pagedData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, page]);

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

    // Reset page if filtered items change
    useMemo(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages, page]);

    return (
        <div className="bg-[#111418] rounded-xl border border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header & Controls */}
            <div className="p-4 border-b border-slate-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[#151b23]">
                <div className="flex items-start justify-between w-full xl:w-auto">
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                            <Table className="w-4 h-4 text-slate-400" />
                            Shift Details Database
                        </h3>
                        <div className="text-slate-400 text-xs">
                            Showing {filteredData.length} of {data.length} records
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Guide Trigger */}
                    <button
                        onClick={() => openHelp(<ShiftDetailsGuide />)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">menu_book</span>
                        Open Guide
                    </button>

                    {/* Search by User */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search user..."
                            value={userFilter}
                            onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                            className="bg-black/30 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-36 sm:w-40"
                        />
                    </div>

                    {/* Search by Job Code */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search job code..."
                            value={jobCodeFilter}
                            onChange={(e) => { setJobCodeFilter(e.target.value); setPage(1); }}
                            className="bg-black/30 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-36 sm:w-40"
                        />
                    </div>

                    {/* Job Type */}
                    <div className="relative">
                        <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={jobTypeFilter}
                            onChange={(e) => { setJobTypeFilter(e.target.value); setPage(1); }}
                            className="bg-black/30 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-8 py-1.5 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer w-32 sm:w-auto"
                        >
                            {uniqueJobTypes.map(type => (
                                <option key={type} value={type} className="bg-slate-900">{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Anomalies Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer bg-black/30 border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0">
                        <input
                            type="checkbox"
                            checked={showAnomaliesOnly}
                            onChange={(e) => { setShowAnomaliesOnly(e.target.checked); setPage(1); }}
                            className="rounded border-slate-600 bg-slate-900 border"
                        />
                        <span className="text-xs text-slate-300 flex items-center gap-1.5 line-clamp-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            Anomalies Only
                        </span>
                    </label>

                    {/* Pagination */}
                    <div className="flex items-center gap-2 text-xs xl:ml-2 xl:border-l border-slate-700 xl:pl-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-2 py-1 bg-black/30 border border-slate-700 rounded text-slate-300 disabled:opacity-50 hover:bg-slate-700 disabled:hover:bg-black/30"
                        >
                            Prev
                        </button>
                        <span className="text-slate-400 whitespace-nowrap">Pg {page} of {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-2 py-1 bg-black/30 border border-slate-700 rounded text-slate-300 disabled:opacity-50 hover:bg-slate-700 disabled:hover:bg-black/30"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#151b23] sticky top-0 z-10">
                        <tr>
                            {['User', 'JobCode', 'TaskType', 'Start', 'Finish', 'Quantity', 'JobType'].map((header) => (
                                <th
                                    key={header}
                                    onClick={() => handleSort(header as keyof EnrichedShiftRecord)}
                                    className="p-3 font-medium text-slate-400 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                                >
                                    <div className="flex items-center gap-1">
                                        {header}
                                        {sortField === header && (
                                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="p-3 font-medium text-slate-400 border-b border-slate-800 whitespace-nowrap">
                                Gap Analysis
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {pagedData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-500">
                                    No records found matching filters
                                </td>
                            </tr>
                        ) : pagedData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-800/50 transition-colors text-slate-300">
                                <td className="p-3 font-medium text-slate-200">{row.User}</td>
                                <td className="p-3 text-slate-400">{row.JobCode}</td>
                                <td className="p-3 text-slate-400">{row.TaskType}</td>
                                <td className="p-3 text-slate-400 whitespace-nowrap">{format(row.Start, 'HH:mm:ss')}</td>
                                <td className="p-3 text-slate-400 whitespace-nowrap">{format(row.Finish, 'HH:mm:ss')}</td>
                                <td className="p-3 text-slate-300 font-mono">{row.Quantity}</td>
                                <td className="p-3 text-slate-400">{row.JobType}</td>
                                <td className="p-3">
                                    {row.gapType !== 'FIRST_TASK' && (
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap ${row.isAnomaly ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                                }`}>
                                                {row.netGap}m net
                                            </span>
                                            <span className="text-[10px] text-slate-500 capitalize whitespace-nowrap">{row.gapType?.replace('_', ' ').toLowerCase()}</span>
                                        </div>
                                    )}
                                    {row.gapType === 'FIRST_TASK' && (
                                        <span className="text-[10px] text-slate-600 italic whitespace-nowrap">Shift Start</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
