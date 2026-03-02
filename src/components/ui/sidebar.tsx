import { useState } from 'react';
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
    PlayCircle,
    ChevronDown,
    ChevronRight,
    Search,
    UploadCloud
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type NavItem = {
    id: string;
    label: string;
    icon: any;
    children?: NavItem[];
};

// Map design implementation to current tabs
export const NAVIGATION_ITEMS: NavItem[] = [
    {
        id: 'dashboard-menu',
        label: 'Dashboard',
        icon: PieChart,
        children: [
            { id: 'velocity', label: 'Velocity Dashboard', icon: Activity },
            { id: 'dashboard', label: 'Detail Dashboard', icon: PieChart },
            { id: 'dictionary', label: 'Adaptation Insights', icon: BookOpen },
            { id: 'engineered-impact', label: 'Happy Path Analysis', icon: ClipboardList },
            { id: 'users', label: 'Employees', icon: Users },
            { id: 'report', label: 'Reports', icon: FileBarChart },
        ]
    },
    {
        id: 'forensics-menu',
        label: 'Forensics',
        icon: Search,
        children: [
            { id: 'timeline', label: 'Timeline Audit', icon: Clock },
            { id: 'forensic', label: 'Forensic Audit', icon: ShieldAlert },
            { id: 'flow', label: 'Flow Audit', icon: ClipboardList },
            { id: 'details', label: 'Shift Details', icon: Files },
            { id: 'metrics', label: 'Supportive Data', icon: Table },
        ]
    },
    {
        id: 'admin-menu',
        label: 'Admin',
        icon: Settings,
        children: [
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'upload', label: 'Data Upload', icon: UploadCloud },
            { id: 'gola-runner', label: 'GOLA Audit Runner', icon: PlayCircle },
            { id: 'guide', label: "User's Guide", icon: BookOpen },
            { id: 'standards', label: 'Engineered Standards', icon: ClipboardList },
        ]
    }
];

export type TabId = string;

interface SidebarProps {
    currentTab: string;
    onTabChange: (tab: TabId) => void;
}

export function Sidebar({
    currentTab,
    onTabChange,
}: SidebarProps) {
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['dashboard-menu', 'forensics-menu', 'admin-menu']);

    const toggleMenu = (id: string) => {
        setExpandedMenus(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const renderItem = (item: NavItem, depth = 0) => {
        if (item.children) {
            const isExpanded = expandedMenus.includes(item.id);
            const hasActiveChild = item.children.some(c => c.id === currentTab);

            return (
                <div key={item.id} className="flex flex-col gap-1 w-full shrink-0">
                    <button
                        onClick={() => toggleMenu(item.id)}
                        className={cn(
                            "flex items-center justify-between xl:justify-between px-3 py-1.5 2xl:py-2 rounded-lg transition-colors group shrink-0",
                            hasActiveChild ? "text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-blue-400"
                        )}
                        title={item.label}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="w-6 h-6 shrink-0" strokeWidth={hasActiveChild ? 2 : 1.5} />
                            <span className="text-sm font-medium hidden xl:inline">{item.label}</span>
                        </div>
                        <div className="hidden xl:block">
                            {isExpanded ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="flex flex-col gap-1 mt-1 pl-2 xl:pl-6 border-l border-slate-800 ml-4">
                            {item.children.map(child => renderItem(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

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
                <item.icon className={cn("w-6 h-6 shrink-0", isActive ? "fill-current" : "")} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-sm font-medium hidden xl:inline relative overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
            </button>
        );
    };

    return (
        <aside className="hidden md:flex md:w-16 lg:w-20 xl:w-64 flex-col bg-[#111418] border-r border-slate-800 h-screen sticky top-0 shrink-0 transition-all duration-300 z-30">
            <div className="flex h-full flex-col justify-between p-4 items-center xl:items-stretch overflow-hidden">
                <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
                    {/* Logo Section */}
                    <div className="flex gap-3 items-center px-0 justify-center xl:justify-start xl:px-2 flex-shrink-0">
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
                    <div className="flex flex-col gap-1 mt-4 w-full flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-700">
                        {NAVIGATION_ITEMS.map((item) => renderItem(item))}
                    </div>
                </div>

                {/* System Status Footer */}
                <div className="p-2 xl:p-4 bg-slate-800 rounded-xl flex flex-col items-center xl:items-start w-full mt-auto shrink-0 z-10">
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
