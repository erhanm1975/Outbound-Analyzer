import React, { useState } from 'react';
import type { EngineeredStandardsConfig } from '../../types';
import { PutWallBreakdown } from './PutWallBreakdown';
import { IIBPBreakdown } from './IIBPBreakdown';
import { IOBPBreakdown } from './IOBPBreakdown';
import { SIBPBreakdown } from './SIBPBreakdown';
import { MICPBreakdown } from './MICPBreakdown';
import { SICPBreakdown } from './SICPBreakdown';
import { OBPPBreakdown } from './OBPPBreakdown';

interface JobStandardsTabsProps {
    config?: EngineeredStandardsConfig;
    onStandardsChange: (newCards: any[]) => void;
}

export function JobStandardsTabs({ config, onStandardsChange }: JobStandardsTabsProps) {
    const [activeTab, setActiveTab] = useState('putwall');

    const tabs = [
        { id: 'putwall', label: 'Put-Wall', component: PutWallBreakdown },
        { id: 'iibp', label: 'IIBP', component: IIBPBreakdown },
        { id: 'iobp', label: 'IOBP', component: IOBPBreakdown },
        { id: 'sibp', label: 'SIBP', component: SIBPBreakdown },
        { id: 'micp', label: 'MICP', component: MICPBreakdown },
        { id: 'sicp', label: 'SICP', component: SICPBreakdown },
        { id: 'obpp', label: 'OBPP', component: OBPPBreakdown },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || PutWallBreakdown;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ActiveComponent
                    config={config}
                    onStandardsChange={onStandardsChange}
                />
            </div>
        </div>
    );
}
