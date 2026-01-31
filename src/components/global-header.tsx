
import { FileText, Filter, X, Bot } from 'lucide-react';

interface GlobalHeaderProps {
    title: string;
    taskCount: number;
    secondaryTaskCount?: number;

    // Filters
    clients: string[];
    jobTypes: string[];
    taskTypes: string[];

    selectedClient: string;
    selectedJobType: string;
    selectedTaskType: string;

    onClientChange: (val: string) => void;
    onJobTypeChange: (val: string) => void;
    onTaskTypeChange: (val: string) => void;
    onClearData: () => void;

    isBenchmark?: boolean;
    onExportContext: () => void;
}

export function GlobalHeader({
    title,
    taskCount,
    secondaryTaskCount,
    clients,
    jobTypes,
    taskTypes,
    selectedClient,
    selectedJobType,
    selectedTaskType,
    onClientChange,
    onJobTypeChange,
    onTaskTypeChange,
    onClearData,
    onExportContext
}: GlobalHeaderProps) {

    const Select = ({
        label,
        value,
        options,
        onChange
    }: {
        label: string;
        value: string;
        options: string[];
        onChange: (v: string) => void
    }) => (
        <div className="flex items-center gap-2 group">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">{label}:</span>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 bg-white/50 border border-white/60 rounded-xl shadow-sm backdrop-blur-sm hover:bg-white/80 focus:ring-2 focus:ring-blue-400/50 outline-none transition-all cursor-pointer"
                >
                    <option value="ALL">All {label}s</option>
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                {/* Custom Chevron */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        </div>
    );

    return (
        <header className="relative z-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-6 pb-2 mb-2 animate-in slide-in-from-top-4 duration-700">
            {/* Left: Title & Info */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Active Session</h2>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 drop-shadow-sm">
                            {title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-[52px]">
                    <span className="px-3 py-1 rounded-full bg-white/40 border border-white/60 text-xs text-slate-600 font-medium backdrop-blur-md shadow-sm">
                        {taskCount.toLocaleString()} tasks
                    </span>
                    {secondaryTaskCount !== undefined && (
                        <span className="px-3 py-1 rounded-full bg-purple-50/40 border border-purple-100/60 text-xs text-purple-600 font-medium backdrop-blur-md shadow-sm">
                            {secondaryTaskCount.toLocaleString()} secondary
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Filters & Actions */}
            <div className="flex flex-wrap items-center gap-4 bg-white/30 p-2 pr-6 rounded-2xl border border-white/50 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
                <div className="flex items-center gap-2 px-3 py-1 border-r border-slate-200/50">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">FILTERS</span>
                </div>

                {clients.length > 0 && (
                    <Select label="Client" value={selectedClient} options={clients} onChange={onClientChange} />
                )}

                {jobTypes.length > 0 && (
                    <Select label="Job Type" value={selectedJobType} options={jobTypes} onChange={onJobTypeChange} />
                )}

                {taskTypes.length > 0 && (
                    <Select label="Task Type" value={selectedTaskType} options={taskTypes} onChange={onTaskTypeChange} />
                )}

                <div className="h-6 w-px bg-slate-200/50 mx-2"></div>

                <button
                    onClick={onClearData}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors group"
                >
                    <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                    Clear Data
                </button>

                <div className="h-6 w-px bg-slate-200/50 mx-2"></div>

                <button
                    onClick={onExportContext}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm"
                    title="Export context for AI interpretation"
                >
                    <Bot className="w-3.5 h-3.5" />
                    AI Export
                </button>
            </div>
        </header>
    );
}
