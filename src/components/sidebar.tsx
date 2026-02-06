import {
    BarChart3,
    Settings,
    FileBarChart,
    BookOpen,
    Table,
    AlertTriangle,
    ShieldAlert,
    Files,
    FileText,
    Calculator,
    RefreshCw,
    Trophy,
    Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { type BufferConfig } from '../types';
import { ConfigPanel } from './config-panel';

// Map design implementation to current tabs
export const NAVIGATION_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'health', label: 'Input Validation', icon: Settings },
    { id: 'jobs', label: 'Job Breakdown', icon: FileText },
    { id: 'dictionary', label: 'Adaptation Insights', icon: BookOpen },
    { id: 'activity', label: 'Activity Matrix', icon: Table },
    { id: 'details', label: 'Shift Details', icon: Files },
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
    { id: 'forensic', label: 'Forensic Audit', icon: ShieldAlert }, // NEW
    { id: 'data-health', label: 'Data Diagnostics', icon: AlertTriangle },
    { id: 'metrics', label: 'Supportive Data', icon: Table },
    { id: 'users', label: 'User Leaderboard', icon: Trophy },
    { id: 'flow', label: 'Flow Audit Matrix', icon: Activity },
    { id: 'report', label: 'Executive Briefing', icon: FileBarChart },
] as const;

export type TabId = typeof NAVIGATION_ITEMS[number]['id'];

interface SidebarProps {
    currentTab: string;
    onTabChange: (tab: TabId) => void;
    config: BufferConfig;
    onConfigChange: (config: BufferConfig) => void;
    suggestedBuffer?: number;
}

export function Sidebar({
    currentTab,
    onTabChange,
    config,
    onConfigChange,
    suggestedBuffer
}: SidebarProps) {

    // Config Handlers
    const handleBufferChange = (val: string) => {
        const num = parseInt(val) || 0;
        onConfigChange({ ...config, intraJobBuffer: num, isIntraJobBufferAutoCalculated: false });
    };

    const handleTransitionChange = (val: string) => {
        const num = parseInt(val) || 0;
        onConfigChange({ ...config, jobTransitionBuffer: num });
    };

    const handleApplySuggestion = () => {
        if (suggestedBuffer !== undefined) {
            onConfigChange({
                ...config,
                intraJobBuffer: suggestedBuffer,
                isIntraJobBufferAutoCalculated: true
            });
        }
    };

    return (
        <aside className="w-72 bg-white dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col flex-shrink-0 h-full overflow-y-auto transition-colors duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">Outbound Performance</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Shift Analyzer v1.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAVIGATION_ITEMS.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600")} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}

                {/* Configuration Section */}
                <div className="pt-4 mt-2 border-t border-border-light dark:border-border-dark">
                    <div className="px-3 mb-2 flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Configuration
                    </div>

                    <div className="px-3">
                        <ConfigPanel
                            config={config}
                            onChange={onConfigChange}
                            suggestedBuffer={suggestedBuffer}
                        />
                    </div>
                </div>

                <div className="px-3 py-4 mt-auto">
                    <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">Client-Side Secure • No Data Persistence</p>
                </div>
            </nav>
        </aside>
    );
}
