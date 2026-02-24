import React, { useMemo, useState } from 'react';
import type { TaskObject, EngineeredStandardsConfig } from '../types';
import { FileDown, Search, Filter, ArrowUpDown } from 'lucide-react';
import { StandardsDetailView } from './standards-detail-view';

interface StandardsImpactViewProps {
    tasks: TaskObject[];
    benchmarkTasks?: TaskObject[];
    config: EngineeredStandardsConfig | undefined;
}

interface AggregatedJob {
    id: string;
    WaveCode: string;
    JobCode: string;
    JobType: string;
    RawJobType: string; // For config lookup

    // Aggregated Standards (Granular)
    PickingInit: number;
    PickingProcess: number;
    PickingTravel: number;

    SortingInit: number;
    SortingProcess: number;

    PackingInit: number;
    PackingProcess: number;

    TotalStandardDuration: number;
    TaskCount: number;
    VisitCount: number; // NEW: Track Visits for accurate Breakdown

    // Summary Stats
    TotalUnits: number;
    TotalOrders: number;
    TotalSKUs: number;
    TotalLocations: number;

    // Sets for counting
    _orders: Set<string>;
    _skus: Set<string>;
    _locs: Set<string>;
    _users: Set<string>; // NEW: Track users for Ideal Init calculation

    AvgStandardPerUnit: number; // NEW
}

export function StandardsImpactView({ tasks, benchmarkTasks, config }: StandardsImpactViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<keyof AggregatedJob>('JobCode');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [selectedJobType, setSelectedJobType] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'grid' | 'summary' | 'detail'>('grid');

    // 0. Job Type Filtering
    const availableJobTypes = useMemo(() => {
        const types = new Set<string>();
        tasks.forEach(t => t.JobType && types.add(t.JobType));
        if (benchmarkTasks) {
            benchmarkTasks.forEach(t => t.JobType && types.add(t.JobType));
        }
        return ['ALL', ...Array.from(types).sort()];
    }, [tasks, benchmarkTasks]);

    const filteredTasks = useMemo(() =>
        selectedJobType === 'ALL' ? tasks : tasks.filter(t => t.JobType === selectedJobType),
        [tasks, selectedJobType]);

    const filteredBenchmarkTasks = useMemo(() =>
        !benchmarkTasks ? [] : (selectedJobType === 'ALL' ? benchmarkTasks : benchmarkTasks.filter(t => t.JobType === selectedJobType)),
        [benchmarkTasks, selectedJobType]);

    // 1. Aggregation Logic
    const aggregatedData = useMemo(() => calculateAggregatedJobData(filteredTasks, config), [filteredTasks, config]);

    const benchmarkAggregatedData = useMemo(() =>
        filteredBenchmarkTasks.length > 0 ? calculateAggregatedJobData(filteredBenchmarkTasks, config) : [],
        [filteredBenchmarkTasks, config]);

    // 2. Filtering & Sorting
    const processedData = useMemo(() => {
        let data = aggregatedData;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(j =>
                j.JobCode.toLowerCase().includes(lower) ||
                j.JobType.toLowerCase().includes(lower)
            );
        }

        return data.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            return sortDirection === 'asc'
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });
    }, [aggregatedData, searchTerm, sortField, sortDirection]);

    const handleSort = (field: keyof AggregatedJob) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const toggleRow = (id: string) => {
        setExpandedJobId(prev => prev === id ? null : id);
    };

    const formatTime = (sec: number) => {
        if (sec === 0) return '-';
        return (sec / 60).toFixed(2); // Convert to Minutes
    };

    // 3. Summary Calculations
    console.log('StandardsImpactView Render:', { aggregatedDataCt: aggregatedData.length, processedDataCt: processedData.length, activeTab });

    const summaryMetrics = useMemo(() => calculateDetailedMetrics(filteredTasks, aggregatedData), [aggregatedData, filteredTasks]);

    const benchmarkMetrics = useMemo(() =>
        filteredBenchmarkTasks && benchmarkAggregatedData.length > 0
            ? calculateDetailedMetrics(filteredBenchmarkTasks, benchmarkAggregatedData)
            : null,
        [filteredBenchmarkTasks, benchmarkAggregatedData]);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-300 overflow-hidden">
            {/* Toolbar & Tabs */}
            <div className="flex flex-col border-b border-white/10 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="p-4 flex justify-between items-center pb-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-400">analytics</span>
                            Engineered Standards Impact
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium">
                            {processedData.length} JOBS
                        </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/50 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setActiveTab('grid')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'grid' ? 'bg-cyan-500/10 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Jobs View
                        </button>
                        <button
                            onClick={() => setActiveTab('detail')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'detail' ? 'bg-cyan-500/10 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Detail View
                        </button>
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'summary' ? 'bg-cyan-500/10 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Summary Breakdown
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search Jobs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 w-64 text-slate-200 placeholder-slate-600 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Job Type Tabs */}
                <div className="px-4 pb-0 pt-0 overflow-x-auto no-scrollbar border-t border-white/5 bg-slate-900/40">
                    <div className="flex gap-2 p-2 min-w-min">
                        {availableJobTypes.map(type => {
                            const flow = config?.jobFlows?.find(f => f.acronym === type);
                            const label = type === 'ALL' ? 'All Activity' : (flow ? `${type} - ${flow.fullName}` : type);

                            return (
                                <button
                                    key={type}
                                    onClick={() => setSelectedJobType(type)}
                                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap border ${selectedJobType === type
                                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm'
                                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-slate-950">
                {activeTab === 'grid' ? (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-white/10">
                            <tr>
                                <th className="w-8 p-3"></th>
                                <HeaderCell label="Job Code" field="JobCode" currentSort={sortField} dir={sortDirection} onSort={handleSort} />
                                <HeaderCell label="Job Type" field="JobType" currentSort={sortField} dir={sortDirection} onSort={handleSort} />

                                <HeaderCell label="Picking Init" sub="(min)" field="PickingInit" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />
                                <HeaderCell label="Picking Process" sub="(min)" field="PickingProcess" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />
                                <HeaderCell label="Picking Travel" sub="(min)" field="PickingTravel" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />

                                <HeaderCell label="Sorting Init" sub="(min)" field="SortingInit" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />
                                <HeaderCell label="Sorting Process" sub="(min)" field="SortingProcess" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />

                                <HeaderCell label="Packing Init" sub="(min)" field="PackingInit" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />
                                <HeaderCell label="Packing Process" sub="(min)" field="PackingProcess" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />

                                <HeaderCell label="Total Standard" sub="(min)" field="TotalStandardDuration" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" highlight />
                                <HeaderCell label="Avg / Unit" sub="(sec)" field="AvgStandardPerUnit" currentSort={sortField} dir={sortDirection} onSort={handleSort} align="right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {processedData.map((row) => (
                                <React.Fragment key={row.id}>
                                    <tr
                                        className={`hover:bg-white/[0.02] transition-colors group cursor-pointer ${expandedJobId === row.id ? 'bg-white/[0.02]' : ''}`}
                                        onClick={() => toggleRow(row.id)}
                                    >
                                        <td className="p-3 text-slate-500 group-hover:text-cyan-400 transition-colors">
                                            <span className="material-symbols-outlined text-sm">
                                                {expandedJobId === row.id ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm font-medium text-slate-200 font-mono group-hover:text-cyan-400 transition-colors border-l-2 border-transparent hover:border-cyan-500">{row.JobCode}</td>
                                        <td className="p-3 text-xs text-slate-400 uppercase tracking-wider">{row.JobType}</td>

                                        <td className="p-3 text-sm text-right text-slate-500 font-mono">{formatTime(row.PickingInit)}</td>
                                        <td className="p-3 text-sm text-right text-slate-400 font-mono">{formatTime(row.PickingProcess)}</td>
                                        <td className="p-3 text-sm text-right text-slate-500 font-mono">{formatTime(row.PickingTravel)}</td>

                                        <td className="p-3 text-sm text-right text-slate-500 font-mono">{formatTime(row.SortingInit)}</td>
                                        <td className="p-3 text-sm text-right text-slate-400 font-mono">{formatTime(row.SortingProcess)}</td>

                                        <td className="p-3 text-sm text-right text-slate-500 font-mono">{formatTime(row.PackingInit)}</td>
                                        <td className="p-3 text-sm text-right text-slate-400 font-mono">{formatTime(row.PackingProcess)}</td>

                                        <td className="p-3 text-sm text-right font-bold text-cyan-400 font-mono bg-cyan-950/10">{formatTime(row.TotalStandardDuration)}</td>
                                        <td className="p-3 text-sm text-right text-emerald-400 font-mono font-medium">
                                            {row.TotalUnits > 0 ? (row.TotalStandardDuration / row.TotalUnits).toFixed(1) + 's' : '-'}
                                        </td>
                                    </tr>

                                    {expandedJobId === row.id && (
                                        <tr>
                                            <td colSpan={11} className="p-0 bg-slate-950 border-b border-white/10">
                                                <JobBreakdownPanel job={row} config={config} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : activeTab === 'detail' ? (
                    <StandardsDetailView jobs={processedData} tasks={filteredTasks} config={config} />
                ) : (
                    <StandardsSummaryPanel metrics={summaryMetrics} benchmark={benchmarkMetrics} />
                )}
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// Summary View
// ------------------------------------------------------------------
function StandardsSummaryPanel({ metrics, benchmark }: { metrics: any, benchmark?: any }) {

    const getBench = (key: string) => benchmark ? benchmark[key] : undefined;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 1. Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard label="Pick Density(units/loc)" value={metrics.density} benchmark={getBench('density')} icon="density_medium" color="cyan" isDecimal />
                <SummaryCard label="Total Visits" value={metrics.totalVisits} benchmark={getBench('totalVisits')} icon="directions_walk" color="slate" invertColor />
                <SummaryCard label="Total Waves" value={metrics.totalWaves} benchmark={getBench('totalWaves')} icon="waves" color="blue" />
                <SummaryCard label="Total Jobs" value={metrics.totalJobs} benchmark={getBench('totalJobs')} icon="work" color="indigo" invertColor />
            </div>

            {/* 2. Average Time Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Avg Time / Order (sec)" value={metrics.avgTimePerOrder} benchmark={getBench('avgTimePerOrder')} icon="shopping_cart" color="emerald" isDecimal />
                <SummaryCard label="Avg Time / Unit (sec)" value={metrics.avgTimePerUnit} benchmark={getBench('avgTimePerUnit')} icon="category" color="violet" isDecimal />
                <SummaryCard label="Avg Time / Order Line (sec)" value={metrics.avgTimePerOrderLine} benchmark={getBench('avgTimePerOrderLine')} icon="list_alt" color="amber" isDecimal />
            </div>

            {/* 3. Global Counts */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard label="Total Units" value={metrics.totalUnits} benchmark={getBench('totalUnits')} icon="inventory_2" color="amber" />
                <SummaryCard label="Unique Orders" value={metrics.totalOrders} benchmark={getBench('totalOrders')} icon="receipt_long" color="slate" />
                <SummaryCard label="Order Lines" value={metrics.totalOrderLines} benchmark={getBench('totalOrderLines')} icon="list_alt" color="slate" />
                <SummaryCard label="Unique SKUs" value={metrics.totalSkus} benchmark={getBench('totalSkus')} icon="qr_code" color="slate" />
                <SummaryCard label="Unique Locations" value={metrics.totalLocs} benchmark={getBench('totalLocs')} icon="location_on" color="slate" />
            </div>

            {/* 3. Duration Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Left: Overall Time */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-cyan-400">timer</span>
                        Global Time Usage
                    </h3>
                    <div className="space-y-4">
                        <TimeRow label="Total Happy Path Duration" value={metrics.totalHappyPath} benchmark={getBench('totalHappyPath')} isTotal />
                        <div className="h-px bg-white/5 my-4" />
                        <TimeRow label="Total Direct Picking" value={metrics.totalDirectPick} benchmark={getBench('totalDirectPick')} />
                        <TimeRow label="Total Picking" value={metrics.totalDirectPick + metrics.totalTravel + metrics.totalPickInit} benchmark={getBench('totalDirectPick') && getBench('totalTravel') && getBench('totalPickInit') ? getBench('totalDirectPick') + getBench('totalTravel') + getBench('totalPickInit') : undefined} />
                        <TimeRow label="Total Pick Travel" value={metrics.totalTravel} benchmark={getBench('totalTravel')} sub="(Includes Init?)" />
                        <TimeRow label="Total Inter-Job Duration" value={metrics.totalInterJob} benchmark={getBench('totalInterJob')} sub="(All Init Time)" />
                    </div>
                </div>

                {/* Right: Downstream Time */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400">precision_manufacturing</span>
                        Process Breakdown
                    </h3>
                    <div className="space-y-4">
                        <TimeRow label="Total Picking Time" value={metrics.totalDirectPick + metrics.totalTravel + metrics.totalPickInit} benchmark={getBench('totalDirectPick') && getBench('totalTravel') && getBench('totalPickInit') ? getBench('totalDirectPick') + getBench('totalTravel') + getBench('totalPickInit') : undefined} />
                        <TimeRow label="Total Sorting Time" value={metrics.totalSortTime} benchmark={getBench('totalSortTime')} />
                        <TimeRow label="Total Packing Time" value={metrics.totalPackTime} benchmark={getBench('totalPackTime')} />
                        <div className="h-px bg-white/5 my-4" />
                        <TimeRow label="Avg Duration / Job" value={metrics.totalJobs > 0 ? metrics.totalHappyPath / metrics.totalJobs : 0} benchmark={getBench('totalJobs') > 0 ? getBench('totalHappyPath') / getBench('totalJobs') : undefined} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TimeRow({ label, value, benchmark, sub, isTotal }: any) {
    const min = value / 60;
    const hours = min / 60;

    let delta = null;
    let deltaPerc = null;
    let deltaColor = 'text-slate-500';

    if (benchmark !== undefined) {
        delta = value - benchmark;
        deltaPerc = benchmark !== 0 ? ((value - benchmark) / benchmark) * 100 : 0;

        // Interpreting delta for Time: LOWER is usually better, but depends on context.
        // Assuming "Total Duration" -> Lower is better (Green).
        // But "Total Direct Time" -> Higher might mean more work done? Or just slower?
        // Let's assume for Efficiency context: Lower Duration for SAME output is better.
        // But here we are comparing two DIFFERENT files (e.g. busy day vs slow day).
        // So "Benchmark" is just reference.
        // Let's us neutral colors for now, or standard Red/Green for +/-

        if (delta > 0) deltaColor = 'text-rose-400';
        else if (delta < 0) deltaColor = 'text-emerald-400';
    }

    return (
        <div className={`flex justify-between items-center ${isTotal ? 'p-3 bg-cyan-950/20 rounded-lg border border-cyan-500/20' : ''}`}>
            <div>
                <div className={`text-sm ${isTotal ? 'font-bold text-cyan-100' : 'text-slate-300'}`}>{label}</div>
                {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
            </div>
            <div className="text-right">
                <div className="flex flex-col items-end">
                    <div className={`font-mono ${isTotal ? 'text-xl font-bold text-cyan-400' : 'text-slate-200'}`}>
                        {hours > 10 ? hours.toFixed(1) + ' h' : min.toFixed(0) + ' m'}
                    </div>
                    {benchmark !== undefined && delta !== null && (
                        <div className={`text-[10px] font-mono flex items-center gap-1 ${deltaColor}`}>
                            <span>{delta > 0 ? '+' : ''}{(delta / 60).toFixed(0)}m</span>
                            <span className="opacity-75">({delta > 0 ? '+' : ''}{deltaPerc?.toFixed(0)}%)</span>
                        </div>
                    )}
                </div>
                {!benchmark && (
                    <div className="text-[10px] text-slate-500 font-mono">
                        {value.toLocaleString()} sec
                    </div>
                )}
            </div>
        </div>
    );
}

function HeaderCell({ label, sub, field, currentSort, dir, onSort, align = 'left', highlight }: any) {
    return (
        <th
            className={`p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none transition-colors ${align === 'right' ? 'text-right' : 'text-left'} ${highlight ? 'text-cyan-500/80 bg-cyan-950/20' : ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex flex-col">
                    <span>{label}</span>
                    {sub && <span className="text-[9px] opacity-70 normal-case tracking-normal">{sub}</span>}
                </div>
                {currentSort === field && (
                    <ArrowUpDown className={`w-3 h-3 ${dir === 'asc' ? 'rotate-0' : 'rotate-180'} transition-transform text-cyan-500`} />
                )}
            </div>
        </th>
    );
}

// ------------------------------------------------------------------
// Job Breakdown Panel
// ------------------------------------------------------------------

function JobBreakdownPanel({ job, config }: { job: AggregatedJob, config?: EngineeredStandardsConfig }) {
    if (!config) return null;

    // 1. Determine Flow Class and Cards
    const flowConfig = config.jobFlows.find(f => f.acronym === job.RawJobType);
    const flowClass = flowConfig?.flowClass || 'Standard';

    const isLocationBased = ['Put-Wall', 'MICP', 'IIBP', 'IOBP', 'SIBP', 'SICP', 'OBPP'].includes(flowClass);

    // Select Picking Card
    let pickingCardId = 'picking_duration';
    if (flowClass === 'MICP') pickingCardId = 'picking_micp';
    else if (flowClass === 'Put-Wall') pickingCardId = 'picking_putwall';
    else if (flowClass === 'IIBP') pickingCardId = 'picking_iibp';
    else if (flowClass === 'IOBP') pickingCardId = 'picking_iobp'; // NEW
    else if (flowClass === 'SIBP') pickingCardId = 'picking_sibp';
    else if (flowClass === 'SICP') pickingCardId = 'picking_sicp';
    else if (flowClass === 'OBPP') pickingCardId = 'picking_obpp';
    else if (isLocationBased) pickingCardId = 'picking_putwall'; // Fallback for others using Location Based

    const pickingCard = config.cards.find(c => c.id === pickingCardId);
    const pickingTravelCard = config.cards.find(c => c.id === 'picking_travel');

    // Sorting Card
    const sortingCardId = flowClass === 'Put-Wall' ? 'sorting_putwall' : 'sorting_duration';
    const sortingCard = config.cards.find(c => c.id === sortingCardId);

    // Packing Card
    let packingCardId = 'packing_duration';
    if (flowClass === 'Put-Wall') packingCardId = 'packing_putwall';
    else if (flowClass === 'IIBP') packingCardId = 'packing_iibp'; // Wait, packing_iibp! Mistyped in previous code? No, line 440 says `packing_iibp`.
    else if (flowClass === 'IOBP') packingCardId = 'packing_iobp'; // NEW
    else if (flowClass === 'SIBP') packingCardId = 'packing_sibp';
    else if (flowClass === 'SICP') packingCardId = 'packing_sicp';
    else if (flowClass === 'MICP') packingCardId = 'packing_micp';
    else if (flowClass === 'OBPP') packingCardId = 'packing_obpp';


    const packingCard = config.cards.find(c => c.id === packingCardId);

    // 3. Calculation Helpers
    const getVar = (card: any, varName: string) => card?.variables.find((v: any) => v.name === varName)?.value || 0;

    // A. Picking Breakdown
    const pickLineBase = getVar(pickingCard, 'Line Base'); // Can be 'Task Base' for IIBP
    const pickVisitBase = getVar(pickingCard, 'Location Based');
    const pickCluster = getVar(pickingCard, 'Cluster Put');
    const pickUnitVar = getVar(pickingCard, 'Unit Variable');
    const pickOrderBase = getVar(pickingCard, 'Order Base');



    // B. Picking Travel Breakdown
    const travelProxy = getVar(pickingTravelCard, 'Travel Proxy');

    // C. Sorting Breakdown 
    const sortUnit = getVar(sortingCard, 'Unit Variable');
    const hasSorting = flowClass === 'Put-Wall';

    // D. Packing Breakdown
    const isMass = flowClass === 'Mass';
    // Map aliases for generic vs specific
    let packBoxName = isMass ? 'Box Overhead (Mass)' : 'Box Overhead (Std)';
    if (flowClass === 'Put-Wall') packBoxName = 'Order Overhead';
    if (flowClass === 'IIBP') packBoxName = 'Order Overhead';

    const packBox = getVar(packingCard, packBoxName);
    const packItem = getVar(packingCard, isMass ? 'Item Handling (Mass)' : 'Unit Variable');

    // For Put-Wall Packing specifically:
    const packPwOrder = getVar(packingCard, 'Order Overhead');
    const packPwUnit = getVar(packingCard, 'Unit Variable');

    return (
        <div className="space-y-6 p-6 bg-slate-950/40 inner-shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 1. Summary Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <SummaryCard label="Total Orders" value={job.TotalOrders} icon="receipt_long" color="blue" />
                <SummaryCard label="Total SKUs" value={job.TotalSKUs} icon="qr_code_2" color="indigo" />
                <SummaryCard label="Total Locations" value={job.TotalLocations} icon="location_on" color="emerald" />
                <SummaryCard label="Total Quantity" value={job.TotalUnits} icon="inventory_2" color="amber" />
            </div>

            {/* 2. Detailed Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Picking Direct */}
                <BreakdownTable
                    title="Picking Duration (Direct Time)"
                    total={job.PickingProcess}
                    icon="shopping_cart"
                    rows={[
                        // Standard: One Scan per Line (Task)
                        ...renderActivityRows(pickingCard?.activities, 'Line Base', job.TaskCount, pickLineBase),



                        // Order Base
                        ...renderActivityRows(pickingCard?.activities, 'Order Base', job.TotalOrders, pickOrderBase),

                        // Location Based: One Scan per Visit
                        ...renderActivityRows(pickingCard?.activities, 'Location Based', job.VisitCount, pickVisitBase),

                        // Cluster: One Scan per Order (Line) for putting
                        ...renderActivityRows(pickingCard?.activities, 'Cluster Put', job.TaskCount, pickCluster),

                        // Unit Variable: Per Unit
                        ...renderActivityRows(pickingCard?.activities, 'Unit Variable', job.TotalUnits, pickUnitVar)
                    ]}
                />

                {/* Picking Travel */}
                <BreakdownTable
                    title="Picking Travel (Travel Time)"
                    total={job.PickingTravel}
                    icon="local_shipping"
                    rows={[
                        // Standard / Mass / OBPP: Use Global Proxy
                        ...(['Standard', 'Mass'].includes(flowClass) ? [
                            ...renderActivityRows(pickingTravelCard?.activities, 'Travel Proxy', job.TaskCount, travelProxy)
                        ] : []),

                        // Dynamic Travel from Card (IIBP, SIBP, SICP, MICP, IOBP, OBPP)
                        // Bucket: 'Travel Info' (IIBP/SIBP/SICP/MICP/OBPP) or 'Travel Proxy' (IOBP)
                        ...renderActivityRows(pickingCard?.activities, 'Travel Info', job.VisitCount, 0),
                        ...(flowClass === 'IOBP' ? renderActivityRows(pickingCard?.activities, 'Travel Proxy', job.VisitCount, 0) : []),

                        // Put-Wall Specific Travel
                        ...renderActivityRows(pickingCard?.activities, 'PutWall Travel', job.VisitCount, 0),

                        // Init
                        ...renderActivityRows(pickingCard?.activities, 'Picking Init', 1, 0),

                        // Generic Fallback
                        ...(flowClass !== 'Put-Wall' && flowClass !== 'IIBP' ? [
                            { label: 'Job Initialization (Travel)', count: 1, unitTime: (job.PickingInit), totalTime: job.PickingInit, sub: 'Start of Job' }
                        ] : [])
                    ]}
                />

                {/* Sorting Process */}
                {hasSorting && (
                    <BreakdownTable
                        title="Sorting Process"
                        total={job.SortingProcess}
                        icon="swap_horiz"
                        rows={[
                            ...renderActivityRows(sortingCard?.activities, 'Unit Variable', job.TotalUnits, sortUnit),
                            // Put-Wall Sorting Init (Granular)
                            ...renderActivityRows(sortingCard?.activities, 'Sorting Init', 1, 0),
                            // Generic Fallback
                            ...(flowClass !== 'Put-Wall' ? [
                                { label: 'Job Initialization', count: 1, unitTime: job.SortingInit, totalTime: job.SortingInit, sub: 'Setup & Finalize' }
                            ] : [])
                        ]}
                    />
                )}

                {/* Packing Process */}
                <BreakdownTable
                    title="Packing Process"
                    total={job.PackingProcess}
                    icon="inventory"
                    rows={[
                        // Put-Wall, IIBP, SIBP, SICP, MICP, IOBP Specifcs
                        ...(flowClass === 'Put-Wall' || flowClass === 'IIBP' || flowClass === 'SIBP' || flowClass === 'SICP' || flowClass === 'MICP' || flowClass === 'IOBP' ? [
                            ...renderActivityRows(packingCard?.activities, 'Order Overhead', job.TaskCount, packPwOrder),
                            ...renderActivityRows(packingCard?.activities, 'Job Overhead', 1, 0), // For IIBP/SIBP/SICP/MICP/IOBP Init
                            ...renderActivityRows(packingCard?.activities, 'SKU Base', job.TaskCount, 0), // For SICP
                            // Unit Variable (Separate bucket)
                            ...renderActivityRows(packingCard?.activities, 'Unit Variable', job.TotalUnits, packPwUnit)
                        ] : [
                            // Standard/Mass/Other
                            { label: `Box Overhead (${isMass ? 'Mass' : 'Std'})`, count: job.TaskCount, unitTime: packBox, totalTime: job.TaskCount * packBox, sub: 'Applied per Task' },
                            { label: `Item Handling (${isMass ? 'Mass' : 'Std'})`, count: job.TotalUnits, unitTime: packItem, totalTime: job.TotalUnits * packItem, sub: 'Applied per Unit' },
                            ...renderActivityRows(packingCard?.activities, isMass ? 'Standard Only' : 'Mass Flow Only', 0, 0),
                            ...renderActivityRows(packingCard?.activities, 'Common', job.TotalUnits, 0),
                        ])
                    ]}
                />

            </div>
        </div>
    );
}

// Helper to deduce rows from Activities (Theoretical)
// This is "reverse engineering" the breakdown, assuming Activities sum up to the Variable.
// We only show the Activity rows if they exist in the card.
function renderActivityRows(activities: any[] | undefined, bucket: string, count: number, bucketValue: number) {
    if (!activities) return [];
    // Filter activities belonging to this bucket
    const acts = activities.filter(a => a.bucket === bucket || (bucket.includes('Variable') && a.bucket === 'Unit Variable') || (bucket.includes('Base') && a.bucket === 'Line Base') || (bucket.includes('Travel') && a.bucket === 'Travel Proxy') || (bucket === 'Job Overhead'));

    // If we have activities, show them?
    // The "bucketValue" is the sum of these activities.
    // If we want to show granular, we show each activity * count.

    // Special Case: Config might not strictly match buckets strings.
    // Let's rely on the "Variable Name" match if possible, or just use the generic rows above.
    // The prompt asks for "breakdown to elements such as scan time etc".
    // So we MUST use activities.

    if (acts.length === 0) return [];

    return acts.map((a: any) => ({
        label: a.name,
        count: count,
        unitTime: a.defaultSeconds,
        totalTime: a.defaultSeconds * count,
        sub: a.bucket
    }));
}


function SummaryCard({ label, value, benchmark, icon, color, isDecimal, invertColor }: any) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/5 text-blue-400 border-blue-500/20',
        indigo: 'bg-indigo-500/5 text-indigo-400 border-indigo-500/20',
        emerald: 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/5 text-amber-400 border-amber-500/20',
        cyan: 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20',
        slate: 'bg-slate-500/5 text-slate-400 border-slate-500/20',
    };

    let delta = null;
    let deltaPerc = null;
    let deltaColor = 'text-slate-500';

    if (benchmark !== undefined) {
        delta = value - benchmark;
        deltaPerc = benchmark !== 0 ? ((value - benchmark) / benchmark) * 100 : 0;

        if (delta > 0) deltaColor = invertColor ? 'text-rose-400' : 'text-emerald-400';
        else if (delta < 0) deltaColor = invertColor ? 'text-emerald-400' : 'text-rose-400';
    }

    return (
        <div className={`p-4 rounded-xl border ${colors[color] || colors.slate} flex items-center gap-4`}>
            <div className={`p-3 rounded-lg bg-slate-900/50`}>
                <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
            <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-white font-mono">
                        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: isDecimal ? 2 : 0, maximumFractionDigits: isDecimal ? 2 : 0 }) : value}
                    </p>
                    {benchmark !== undefined && delta !== null && (
                        <div className={`text-xs font-mono font-medium mb-1 ${deltaColor}`}>
                            {delta > 0 ? '+' : ''}{typeof delta === 'number' ? delta.toLocaleString(undefined, { maximumFractionDigits: isDecimal ? 2 : 0 }) : delta}
                            <span className="opacity-75 ml-0.5">({delta > 0 ? '+' : ''}{deltaPerc?.toFixed(0)}%)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function BreakdownTable({ title, total, icon, rows }: any) {
    return (
        <div className="bg-slate-950/50 border border-white/5 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-500">{icon}</span>
                    <h4 className="font-semibold text-slate-200 text-sm">{title}</h4>
                </div>
                <div className="text-right">
                    <span className="text-cyan-400 font-mono font-bold text-lg">{(total / 60).toFixed(2)}</span>
                    <span className="text-xs text-slate-500 ml-1">min</span>
                </div>
            </div>
            <div className="p-0 flex-1">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-500 border-b border-white/5">
                        <tr>
                            <th className="p-3 font-medium">Activity</th>
                            <th className="p-3 font-medium text-right">Count</th>
                            <th className="p-3 font-medium text-right">Std (sec)</th>
                            <th className="p-3 font-medium text-right">Total (sec)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-3 text-slate-300">
                                    <div className="font-medium">{row.label}</div>
                                    {row.sub && <div className="text-[10px] text-slate-500">{row.sub}</div>}
                                </td>
                                <td className="p-3 text-right text-slate-400 font-mono">{row.count.toLocaleString()}</td>
                                <td className="p-3 text-right text-slate-400 font-mono">{row.unitTime.toFixed(2)}</td>
                                <td className="p-3 text-right text-slate-200 font-mono font-medium">{row.totalTime.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// HELPER FUNCTIONS (Pure Logic for Benchmarking)
// ------------------------------------------------------------------

function calculateAggregatedJobData(tasks: TaskObject[], config: EngineeredStandardsConfig | undefined): AggregatedJob[] {
    const jobMap = new Map<string, AggregatedJob>();

    // Sort tasks by JobCode and Start Time to ensure correct Visit detection order
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.JobCode !== b.JobCode) return a.JobCode.localeCompare(b.JobCode);
        return a.Start.getTime() - b.Start.getTime();
    });

    // We need to track last Location per Job to count Visits
    const jobLastLoc = new Map<string, string>();

    // Helper to get variable from config
    const getVar = (cardId: string, varName: string, defaultVal: number) => {
        if (!config?.cards) return defaultVal;
        const card = config.cards.find(c => c.id === cardId);
        return card?.variables.find(v => v.name === varName)?.value ?? defaultVal;
    };

    sortedTasks.forEach(task => {
        if (!task.JobCode || task.JobCode === 'Unassigned') return;

        const key = task.JobCode;

        if (!jobMap.has(key)) {
            jobMap.set(key, {
                id: key,
                WaveCode: task.WaveCode || 'N/A',
                JobCode: task.JobCode,
                RawJobType: task.JobType || 'Unknown',
                JobType: (() => {
                    const acronym = task.JobType || 'Unknown';
                    const flow = config?.jobFlows?.find(f => f.acronym === acronym);
                    return flow ? `${acronym} - ${flow.fullName}` : acronym;
                })(),
                PickingInit: 0,
                PickingProcess: 0,
                PickingTravel: 0,
                SortingInit: 0,
                SortingProcess: 0,
                PackingInit: 0,
                PackingProcess: 0,
                TotalStandardDuration: 0,
                TaskCount: 0,
                VisitCount: 0,
                TotalUnits: 0,
                TotalOrders: 0,
                TotalSKUs: 0,
                TotalLocations: 0,
                _orders: new Set(),
                _skus: new Set(),
                _locs: new Set(),
                _users: new Set(),
                AvgStandardPerUnit: 0
            });
        }

        const job = jobMap.get(key)!;

        // Visit Detection Logic (matches warehouse-transform)
        const lastLoc = jobLastLoc.get(key);
        if (task.Location !== lastLoc) {
            job.VisitCount++;
            jobLastLoc.set(key, task.Location);
        }

        // Accumulate Time
        job.PickingInit += task.StandardPickingInitSec || 0;
        job.PickingProcess += task.StandardPickingProcessSec || 0;
        job.PickingTravel += task.StandardPickingTravelSec || 0;

        job.SortingInit += task.StandardSortingInitSec || 0;
        job.SortingProcess += task.StandardSortingProcessSec || 0;

        job.PackingInit += task.StandardPackingInitSec || 0;
        job.PackingProcess += task.StandardPackingProcessSec || 0;

        job.TotalStandardDuration += (
            (task.StandardPickingInitSec || 0) + (task.StandardPickingProcessSec || 0) + (task.StandardPickingTravelSec || 0) +
            (task.StandardSortingInitSec || 0) + (task.StandardSortingProcessSec || 0) +
            (task.StandardPackingInitSec || 0) + (task.StandardPackingProcessSec || 0)
        );

        // Accumulate Stats
        job.TaskCount++;
        job.TotalUnits += task.Quantity;

        if (task.OrderCode) job._orders.add(task.OrderCode);
        if (task.SKU) job._skus.add(task.SKU);
        if (task.Location) job._locs.add(task.Location);
        if (task.User) job._users.add(task.User);
    });

    // Finalize Sets & Calculate Ideal Inits
    return Array.from(jobMap.values()).map(j => {
        const userCount = j._users.size || 1;

        // Recalculate Total (Just Sum)
        const newTotal =
            j.PickingProcess + j.PickingTravel + j.PickingInit +
            j.SortingProcess + j.SortingInit +
            j.PackingProcess + j.PackingInit;

        return {
            ...j,
            TotalOrders: j._orders.size,
            TotalSKUs: j._skus.size,
            TotalLocations: j._locs.size,
            AvgStandardPerUnit: j.TotalUnits > 0 ? newTotal / j.TotalUnits : 0,

            // No Overrides - Trust warehouse-transform
            TotalStandardDuration: newTotal
        };
    });
}

function calculateDetailedMetrics(tasks: TaskObject[], aggregatedData: AggregatedJob[]) {
    const waves = new Set<string>();
    const orders = new Set<string>();
    const skus = new Set<string>();
    const orderLines = new Set<string>(); // unique Order+SKU combos

    const visitSet = new Set<string>();
    let totalUnits = 0;

    let totalHappyPath = 0;
    let totalPickDirect = 0;
    let totalPickTravel = 0;
    let totalPickInit = 0;
    let totalSortInit = 0;
    let totalSortProcess = 0;
    let totalPackInit = 0;
    let totalPackProcess = 0;

    tasks.forEach(t => {
        if (t.JobCode && t.Location) {
            visitSet.add(`${t.JobCode}|${t.Location}`);
        }

        if (t.TaskType && t.TaskType.toLowerCase().includes('pick')) {
            totalUnits += t.Quantity || 0;
        }

        if (t.OrderCode && t.OrderCode !== 'Unknown' && t.OrderCode !== '') orders.add(t.OrderCode);
        if (t.SKU && t.SKU !== '') skus.add(t.SKU);
        if (t.WaveCode && t.WaveCode !== 'N/A') waves.add(t.WaveCode);

        // Order Line = unique Order + SKU combination
        if (t.OrderCode && t.OrderCode !== 'Unknown' && t.OrderCode !== '' && t.SKU && t.SKU !== '') {
            orderLines.add(`${t.OrderCode}|${t.SKU}`);
        }
    });

    aggregatedData.forEach(job => {
        totalHappyPath += job.TotalStandardDuration;
        totalPickInit += job.PickingInit;
        totalPickDirect += job.PickingProcess;
        totalPickTravel += job.PickingTravel;
        totalSortInit += job.SortingInit;
        totalSortProcess += job.SortingProcess;
        totalPackInit += job.PackingInit;
        totalPackProcess += job.PackingProcess;
    });

    // Avg time metrics (in seconds) — pick + sort + pack
    const avgTimePerOrder = orders.size > 0 ? totalHappyPath / orders.size : 0;
    const avgTimePerUnit = totalUnits > 0 ? totalHappyPath / totalUnits : 0;
    const avgTimePerOrderLine = orderLines.size > 0 ? totalHappyPath / orderLines.size : 0;

    return {
        density: visitSet.size > 0 ? totalUnits / visitSet.size : 0,
        totalWaves: waves.size,
        totalJobs: aggregatedData.length,
        totalOrders: orders.size,
        totalOrderLines: orderLines.size,
        totalTasks: tasks.length,
        totalLocs: new Set(tasks.map(t => t.Location).filter(Boolean)).size,
        totalSkus: skus.size,
        totalVisits: visitSet.size,
        totalUnits: totalUnits,

        avgTimePerOrder,
        avgTimePerUnit,
        avgTimePerOrderLine,

        totalHappyPath,
        totalTravel: totalPickTravel,
        totalPickInit: totalPickInit,
        totalInterJob: totalPickInit + totalSortInit + totalPackInit,
        totalDirectPick: totalPickDirect,
        totalSort: totalSortProcess,
        totalPack: totalPackProcess,
        totalSortTime: totalSortInit + totalSortProcess,
        totalPackTime: totalPackInit + totalPackProcess,

        uniqueTaskTypes: Array.from(new Set(tasks.map(t => t.TaskType))).sort()
    };
}
