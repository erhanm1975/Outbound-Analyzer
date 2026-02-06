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
        <header className="sticky top-0 z-40 bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex-shrink-0 transition-colors duration-200">
            <div className="px-6 py-3 flex items-center justify-between">

                {/* Left: File Selection & Comparison */}
                <div className="flex items-center space-x-3">
                    {/* Primary File */}
                    <div className="relative group">
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 hover:border-blue-300 transition-colors relative">
                            <FileSpreadsheet className="text-blue-600 dark:text-blue-400 w-4 h-4" />
                            <select
                                value={activeFile || ''}
                                onChange={(e) => onFileChange(e.target.value)}
                                className="appearance-none bg-transparent border-none text-[11px] font-medium text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer pr-4 w-32 truncate"
                            >
                                {allFiles.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 text-gray-500 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    <span className="text-gray-300 text-[10px] font-medium">vs</span>

                    {/* Benchmark File */}
                    <div className="relative group">
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-colors text-gray-500 dark:text-gray-400 relative">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <select
                                value={benchmarkFile || ''}
                                onChange={(e) => onBenchmarkChange(e.target.value || null)}
                                className="appearance-none bg-transparent border-none text-[11px] font-medium focus:ring-0 cursor-pointer pr-4 w-32 truncate"
                            >
                                <option value="">None</option>
                                {allFiles.filter(f => f !== activeFile).map(fname => (
                                    <option key={fname} value={fname}>{fname}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Right: Filters & Actions */}
                <div className="flex items-center bg-white dark:bg-surface-dark rounded-full border border-gray-200 dark:border-gray-700 shadow-sm px-1 py-1">
                    {/* Client Filter */}
                    <div className="flex items-center px-3 space-x-1 border-r border-transparent">
                        <div className="relative flex items-center">
                            <Filter className="w-3.5 h-3.5 text-gray-500 mr-2" />
                            <select
                                value={selectedClient}
                                onChange={(e) => onClientChange(e.target.value)}
                                className="appearance-none bg-transparent text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded cursor-pointer focus:ring-0 border-none pr-6"
                            >
                                <option value="ALL">All Clients</option>
                                {clients.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pl-2 pr-2 border-l border-gray-200 dark:border-gray-700 h-6 flex items-center">
                        <button
                            onClick={onClearData}
                            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center mr-3 uppercase font-semibold tracking-wide"
                        >
                            <X className="w-3.5 h-3.5 mr-0.5" /> Clear
                        </button>

                        <button
                            onClick={onExportContext}
                            className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded text-[10px] font-bold flex items-center hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors uppercase tracking-wide"
                        >
                            <Bot className="w-3.5 h-3.5 mr-1" /> AI Export
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
