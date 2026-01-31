import { type ReactNode } from 'react';
import { Settings, BarChart3, Table, AlertTriangle, FileBarChart } from 'lucide-react';
import { cn } from '../lib/utils';

// Basic navigation Tabs
const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'health', label: 'Input Validation', icon: Settings }, // Changed from Shift Health
    { id: 'jobs', label: 'Job Breakdown', icon: FileBarChart },
    { id: 'activity', label: 'Activity Matrix', icon: Table },
    { id: 'details', label: 'Shift Details', icon: Table },
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
    { id: 'data-health', label: 'Data Diagnostics', icon: AlertTriangle },
    { id: 'metrics', label: 'Supportive Data', icon: Table },
    { id: 'report', label: 'Executive Briefing', icon: FileBarChart },
] as const;

type TabId = typeof TABS[number]['id'];


interface LayoutProps {
    children: ReactNode;
    sidebar: ReactNode;
    currentTab: TabId;
    onTabChange: (tab: TabId) => void;
}

export function Layout({ children, sidebar, currentTab, onTabChange }: LayoutProps) {
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shadow-sm z-10">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 leading-tight">Outbound Performance</h1>
                        <p className="text-xs text-slate-500 font-medium">Shift Analyzer v1.0</p>
                    </div>
                </div>

                <div className="p-2 space-y-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                currentTab === tab.id
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4", currentTab === tab.id ? "text-blue-600" : "text-slate-400")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Settings className="w-3 h-3" />
                            Configuration
                        </h2>
                        {sidebar}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-center text-slate-400">
                        Client-Side Secure • No Data Persistence
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50/80">
                {children}
            </main>
        </div>
    );
}
