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
    Trophy,
    Activity,
    PieChart,
    Users,
    ClipboardList,
    Clock,
    PlayCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { type BufferConfig } from '../types';

// Map design implementation to current tabs
export const NAVIGATION_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'jobs', label: 'Job Analysis', icon: FileText },
    { id: 'dictionary', label: 'Adaptation Insights', icon: BookOpen },
    { id: 'velocity', label: 'Velocity Dashboard', icon: Activity },
    { id: 'forensic', label: 'Forensic Audit', icon: ShieldAlert },
    { id: 'timeline', label: 'Timeline Audit', icon: Clock },
    { id: 'gola-runner', label: 'GOLA Audit Runner', icon: PlayCircle },
    { id: 'standards', label: 'Engineered Standards', icon: ClipboardList },
    { id: 'engineered-impact', label: 'Happy Path Analysis', icon: ClipboardList },
    { id: 'users', label: 'Employees', icon: Users },
    { id: 'report', label: 'Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'guide', label: "User's Guide", icon: BookOpen }, // User Guide
    // Secondary / Advanced Tabs
    { id: 'metrics', label: 'Supportive Data', icon: Table },
    { id: 'activity', label: 'Activity Matrix', icon: Activity },
    { id: 'flow', label: 'Flow Audit', icon: ClipboardList },
    { id: 'details', label: 'Shift Details', icon: Files },
    { id: 'health', label: 'Diagnostics', icon: AlertTriangle },
] as const;

export type TabId = typeof NAVIGATION_ITEMS[number]['id'];

interface SidebarProps {
    currentTab: string;
    onTabChange: (tab: TabId) => void;
    // Config props removed from sidebar, moved to separate screen
}

export function Sidebar({
    currentTab,
    onTabChange,
}: SidebarProps) {

    return (
        <aside className="hidden md:flex md:w-16 lg:w-20 xl:w-64 flex-col bg-[#111418] border-r border-slate-800 h-screen sticky top-0 shrink-0 transition-all duration-300 z-30">
            <div className="flex h-full flex-col justify-between p-4 items-center xl:items-stretch">
                <div className="flex flex-col gap-4 w-full">
                    {/* Logo Section */}
                    <div className="flex gap-3 items-center px-0 justify-center xl:justify-start xl:px-2">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-slate-100 shrink-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                                <ShieldAlert className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="hidden xl:flex flex-col overflow-hidden">
                            <h1 className="text-white text-base font-bold leading-normal truncate">Forensic OS</h1>
                            <p className="text-slate-400 text-xs font-medium leading-normal truncate">Warehouse Admin</p>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex flex-col gap-1 mt-4 w-full flex-1 overflow-y-auto min-h-0 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-700">
                        {NAVIGATION_ITEMS.map((item) => {
                            const isActive = currentTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    title={item.label}
                                    className={cn(
                                        "flex items-center justify-center xl:justify-start gap-3 px-3 py-1.5 2xl:py-2 rounded-lg transition-colors group shrink-0",
                                        isActive
                                            ? "bg-blue-900/20 text-blue-400"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-blue-400"
                                    )}
                                >
                                    <item.icon className={cn("w-6 h-6", isActive ? "fill-current" : "")} strokeWidth={isActive ? 2 : 1.5} />
                                    <span className="text-sm font-medium hidden xl:inline">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* System Status Footer */}
                <div className="p-2 xl:p-4 bg-slate-800 rounded-xl flex flex-col items-center xl:items-start w-full mt-auto">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hidden xl:block">System Status</p>
                    <div className="flex items-center gap-2 mb-1" title="Sync: Active">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></div>
                        <span className="text-xs font-medium text-slate-200 hidden xl:inline">Sync: Active</span>
                    </div>
                    <div className="flex items-center gap-2" title="Server: Online">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                        <span className="text-xs font-medium text-slate-200 hidden xl:inline">Server: Online</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
