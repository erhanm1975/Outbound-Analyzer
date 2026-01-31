import { type EnrichedShiftRecord } from '../types';
import { Table, ArrowDown, ArrowUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';

interface ShiftDetailViewProps {
    data: EnrichedShiftRecord[];
}

export function ShiftDetailView({ data }: ShiftDetailViewProps) {
    const [sortField, setSortField] = useState<keyof EnrichedShiftRecord>('Start');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const handleSort = (field: keyof EnrichedShiftRecord) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (aVal === undefined || bVal === undefined) return 0;

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortField, sortDir]);

    const pagedData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, page]);

    const totalPages = Math.ceil(data.length / pageSize);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Table className="w-4 h-4 text-slate-500" />
                    Shift Details
                    <span className="text-slate-400 text-xs font-normal">({data.length} records)</span>
                </h3>

                <div className="flex items-center gap-2 text-xs">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-slate-100"
                    >
                        Prev
                    </button>
                    <span className="text-slate-500">Page {page} of {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-slate-100"
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            {['User', 'JobCode', 'TaskType', 'Start', 'Finish', 'Quantity', 'JobType'].map((header) => (
                                <th
                                    key={header}
                                    onClick={() => handleSort(header as keyof EnrichedShiftRecord)}
                                    className="p-3 font-medium text-slate-500 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        {header}
                                        {sortField === header && (
                                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="p-3 font-medium text-slate-500 border-b border-slate-200">
                                Gap Analysis
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pagedData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-medium text-slate-700">{row.User}</td>
                                <td className="p-3 text-slate-600">{row.JobCode}</td>
                                <td className="p-3 text-slate-600">{row.TaskType}</td>
                                <td className="p-3 text-slate-600 whitespace-nowrap">{format(row.Start, 'HH:mm:ss')}</td>
                                <td className="p-3 text-slate-600 whitespace-nowrap">{format(row.Finish, 'HH:mm:ss')}</td>
                                <td className="p-3 text-slate-600 font-mono">{row.Quantity}</td>
                                <td className="p-3 text-slate-600">{row.JobType}</td>
                                <td className="p-3 text-slate-600">
                                    {row.gapType !== 'FIRST_TASK' && (
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${row.isAnomaly ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                                }`}>
                                                {row.netGap}m net
                                            </span>
                                            <span className="text-[10px] text-slate-400 capitalize">{row.gapType?.replace('_', ' ').toLowerCase()}</span>
                                        </div>
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
