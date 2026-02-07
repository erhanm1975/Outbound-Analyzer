import { Filter, X, Bot, TrendingUp, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface GlobalHeaderProps {
    title: string;
    taskCount: number;
    secondaryTaskCount?: number;

    // Files & Benchmark
    allFiles: string[];
    activeFile: string | null;
    onFileChange: (file: string) => void;
    benchmarkFile: string | null;
    onBenchmarkChange: (file: string | null) => void;

    // Filters
    clients: string[];
    selectedClient: string;
    onClientChange: (val: string) => void;
    onClearData: () => void;

    isBenchmark?: boolean;
    onExportContext: () => void;
}

export function GlobalHeader({
    title,
    // taskCount, // Not used in new design explicitly or used differently
    // secondaryTaskCount,
    allFiles,
    activeFile,
    onFileChange,
    benchmarkFile,
    onBenchmarkChange,
    clients,
    selectedClient,
    onClientChange,
    onClearData,
    onExportContext
}: GlobalHeaderProps) {

    return (
        <header className="sticky top-0 z-40 bg-[#111418] border-b border-slate-800 flex-shrink-0 transition-colors duration-200">
            <div className="px-6 py-3 flex items-center justify-between">

                {/* Left: File Selection & Comparison */}
                <div className="flex items-center space-x-3">
                    {/* Primary File */}
                    <div className="relative group">
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-900/20 rounded-lg border border-blue-800 hover:border-blue-700 transition-colors relative">
                            <FileSpreadsheet className="text-blue-400 w-4 h-4" />
                            <select
                                value={activeFile || ''}
                                onChange={(e) => onFileChange(e.target.value)}
                                className="appearance-none bg-transparent border-none text-[11px] font-medium text-blue-100 focus:ring-0 cursor-pointer pr-4 w-32 truncate"
                            >
                                {allFiles.map(f => (
                                    <option key={f} value={f} className="bg-slate-900 text-slate-200">{f}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 text-blue-500 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    <span className="text-slate-600 text-[10px] font-medium">vs</span>

                    {/* Benchmark File */}
                    <div className="relative group">
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors text-slate-400 relative">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <select
                                value={benchmarkFile || ''}
                                onChange={(e) => onBenchmarkChange(e.target.value || null)}
                                className="appearance-none bg-transparent border-none text-[11px] font-medium focus:ring-0 cursor-pointer pr-4 w-32 truncate"
                            >
                                <option value="" className="bg-slate-900 text-slate-400">None</option>
                                {allFiles.filter(f => f !== activeFile).map(fname => (
                                    <option key={fname} value={fname} className="bg-slate-900 text-slate-200">{fname}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 text-slate-600 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Right: Filters & Actions */}
                <div className="flex items-center bg-slate-900 rounded-full border border-slate-800 shadow-sm px-1 py-1">
                    {/* Client Filter */}
                    <div className="flex items-center px-3 space-x-1 border-r border-transparent">
                        <div className="relative flex items-center">
                            <Filter className="w-3.5 h-3.5 text-slate-500 mr-2" />
                            <select
                                value={selectedClient}
                                onChange={(e) => onClientChange(e.target.value)}
                                className="appearance-none bg-transparent text-xs font-medium text-slate-300 hover:bg-slate-800 px-2 py-1 rounded cursor-pointer focus:ring-0 border-none pr-6"
                            >
                                <option value="ALL" className="bg-slate-900">All Clients</option>
                                {clients.map(c => (
                                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 text-slate-600 w-3.5 h-3.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pl-2 pr-2 border-l border-slate-800 h-6 flex items-center">
                        <button
                            onClick={onClearData}
                            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center mr-3 uppercase font-semibold tracking-wide"
                        >
                            <X className="w-3.5 h-3.5 mr-0.5" /> Clear
                        </button>

                        <button
                            onClick={onExportContext}
                            className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded text-[10px] font-bold flex items-center hover:bg-emerald-900/50 transition-colors uppercase tracking-wide"
                        >
                            <Bot className="w-3.5 h-3.5 mr-1" /> AI Export
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
