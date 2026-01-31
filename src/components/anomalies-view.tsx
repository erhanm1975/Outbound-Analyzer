import { type TelemetryLog } from '../types';
import { AlertTriangle, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

interface AnomaliesViewProps {
    telemetry: TelemetryLog[];
}

export function AnomaliesView({ telemetry }: AnomaliesViewProps) {
    const [filter, setFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    const filtered = useMemo(() => {
        return telemetry.filter(t => {
            const matchText = t.user.toLowerCase().includes(filter.toLowerCase()) ||
                t.message.toLowerCase().includes(filter.toLowerCase());
            const matchType = typeFilter === 'ALL' || t.type === typeFilter;
            return matchText && matchType;
        });
    }, [telemetry, filter, typeFilter]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Anomaly Investigation
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{filtered.length}</span>
                </h3>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="w-3 h-3 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter user or message..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white"
                    >
                        <option value="ALL">All Types</option>
                        <option value="OVERLAP">Overlaps</option>
                        <option value="GAP">Gaps</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                    <div className="text-center text-slate-400 mt-20 text-sm">No anomalies found matching your criteria.</div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((t, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="mt-1">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-700">{t.user}</span>
                                        <span className="text-[10px] font-mono text-slate-400">{t.timestamp.toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">{t.message}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                            {t.type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
