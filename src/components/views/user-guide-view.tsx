import React, { useState } from 'react';
import { Target, BarChart2, Lightbulb, ClipboardList, Users, Search, ShieldAlert, Files, Activity } from 'lucide-react';
import { DataHealthGuide } from '../guide/data-health-guide';
import { VelocityGuide } from '../guide/velocity-guide';
import { AdaptationGuide } from '../guide/adaptation-guide';
import { HappyPathGuide } from '../guide/happy-path-guide';
import { EmployeeGuide } from '../guide/employee-guide';
import { TimelineAuditGuide } from '../guide/timeline-audit-guide';
import { ForensicAuditGuide } from '../guide/forensic-audit-guide';
import { FlowAuditGuide } from '../guide/flow-audit-guide';
import { ShiftDetailsGuide } from '../guide/shift-details-guide';
import { ExecutiveBriefGuide } from '../guide/executive-brief-guide';
import { cn } from '../../lib/utils';

type TocSection = { id?: string; title: string; icon?: any; isHeader?: boolean };

const TOC_SECTIONS: TocSection[] = [
    { id: 'sec-1', title: '1. Executive Brief', icon: Target },
    { id: 'sec-2', title: '2. Data Health', icon: Activity },
    { id: 'sec-3', title: '3. Velocity Dashboard', icon: Target },
    { id: 'sec-4', title: '4. Adaptation Insights', icon: Lightbulb },
    { id: 'sec-5', title: '5. Happy Path Analysis', icon: ClipboardList },
    { id: 'sec-6', title: '6. Employee Performance', icon: Users },
    { isHeader: true, title: 'Forensics' },
    { id: 'sec-7', title: '7. Timeline Audit', icon: Search },
    { id: 'sec-8', title: '8. Forensic Audit', icon: ShieldAlert },
    { id: 'sec-9', title: '9. Flow Audit', icon: ClipboardList },
    { id: 'sec-10', title: '10. Shift Details', icon: Files },
];

export function UserGuideView() {
    const [activeSection, setActiveSection] = useState('sec-1');

    const scrollToSection = (id: string) => {
        const container = document.getElementById('scroll-container');
        const element = document.getElementById(id);
        if (container && element) {
            const offsetTop = element.offsetTop - container.offsetTop;
            container.scrollTo({ top: offsetTop - 32, behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col relative overflow-hidden">

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 xl:px-7 xl:py-4 shrink-0 z-20 flex justify-between items-center shadow-sm">
                <div className="max-w-7xl">
                    <h1 className="text-lg xl:text-xl font-bold tracking-tight mb-0.5">User's Guide</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] xl:text-xs">Documentation and reference for Job Analyzer metrics and views.</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* TOC Sidebar */}
                <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hidden md:flex flex-col p-3 overflow-y-auto shrink-0 z-10 custom-scrollbar">
                    <h4 className="font-semibold text-slate-300 mb-3 px-2 uppercase tracking-wider text-[10px]">Table of Contents</h4>
                    <nav className="space-y-0.5">
                        {TOC_SECTIONS.map(sec => {
                            if (sec.isHeader) {
                                return (
                                    <h4 key={sec.title} className="font-semibold text-slate-500 mt-4 mb-1.5 px-3 uppercase tracking-wider text-[9px]">
                                        {sec.title}
                                    </h4>
                                );
                            }
                            const Icon = sec.icon;
                            return (
                                <button
                                    key={sec.id}
                                    onClick={() => scrollToSection(sec.id!)}
                                    className={cn(
                                        "flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs rounded-lg transition-all",
                                        activeSection === sec.id
                                            ? "bg-blue-500/10 text-blue-400 font-medium"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5 shrink-0", activeSection === sec.id ? "text-blue-400" : "text-slate-500")} />
                                    <span className="truncate">{sec.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Main Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-3 md:p-6 scroll-smooth relative" id="scroll-container">
                    <div id="manual-content" className="max-w-5xl mx-auto space-y-14 bg-[#0B1120] text-slate-100 p-5 md:p-7 rounded-xl ring-1 ring-slate-800/50 shadow-xl">

                        {/* SECTION 1: Executive Brief */}
                        <section id="sec-1" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Target className="w-5 h-5 text-indigo-500" />
                                    <h2 className="text-lg font-semibold">1. Executive Brief</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ExecutiveBriefGuide />
                            </div>
                        </section>

                        {/* SECTION 2: Data Health */}
                        <section id="sec-2" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-lg font-semibold">2. Data Health</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <DataHealthGuide />
                            </div>
                        </section>

                        {/* SECTION 3: Velocity Dashboard */}
                        <section id="sec-3" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Target className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold">3. Velocity Dashboard</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <VelocityGuide />
                            </div>
                        </section>

                        {/* SECTION 4: Adaptation Insights */}
                        <section id="sec-4" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Lightbulb className="w-5 h-5 text-amber-500" />
                                    <h2 className="text-lg font-semibold">4. Adaptation Insights</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <AdaptationGuide />
                            </div>
                        </section>

                        {/* SECTION 5: Happy Path Analysis */}
                        <section id="sec-5" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <ClipboardList className="w-5 h-5 text-indigo-400" />
                                    <h2 className="text-lg font-semibold">5. Happy Path Analysis</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <HappyPathGuide />
                            </div>
                        </section>

                        {/* SECTION 6: Employee Performance */}
                        <section id="sec-6" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Users className="w-5 h-5 text-violet-500" />
                                    <h2 className="text-lg font-semibold">6. Employee Performance</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <EmployeeGuide />
                            </div>
                        </section>

                        {/* SECTION 7: Timeline Audit */}
                        <section id="sec-7" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Search className="w-5 h-5 text-rose-500" />
                                    <h2 className="text-lg font-semibold">7. Timeline Audit</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <TimelineAuditGuide />
                            </div>
                        </section>

                        {/* SECTION 8: Forensic Audit */}
                        <section id="sec-8" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <ShieldAlert className="w-5 h-5 text-indigo-500" />
                                    <h2 className="text-lg font-semibold">8. Forensic Audit</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ForensicAuditGuide />
                            </div>
                        </section>

                        {/* SECTION 9: Flow Audit */}
                        <section id="sec-9" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <ClipboardList className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-lg font-semibold">9. Flow Audit</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <FlowAuditGuide />
                            </div>
                        </section>

                        {/* SECTION 10: Shift Details */}
                        <section id="sec-10" className="scroll-mt-6 space-y-4">
                            <div className="border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Files className="w-5 h-5 text-slate-500" />
                                    <h2 className="text-lg font-semibold">10. Shift Details</h2>
                                </div>
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ShiftDetailsGuide />
                            </div>
                        </section>

                    </div>

                    <div className="mt-8 text-center text-sm text-slate-500 max-w-6xl mx-auto flex justify-between pb-8 px-4">
                        <span>Generated by Antigravity OS</span>
                        <span>Operational User Guide</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
