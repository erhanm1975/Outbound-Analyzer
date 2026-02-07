import React, { useState } from 'react';
import { VelocityGuide } from './guide/velocity-guide';

export function UserGuideView() {
    const [activeTab, setActiveTab] = useState<'velocity'>('velocity');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">User's Guide</h1>
                    <p className="text-slate-500 dark:text-slate-400">Documentation and reference for Job Analyzer metrics and views.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('velocity')}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'velocity'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Velocity Dashboard
                        </button>
                        {/* Future tabs can be added here */}
                        <button
                            className="py-4 text-sm font-medium border-b-2 border-transparent text-slate-400 cursor-not-allowed"
                            disabled
                        >
                            Job Analysis (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'velocity' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <VelocityGuide />
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
