import { useState, useEffect } from 'react';
import { type BufferConfig, DEFAULT_BUFFER_CONFIG } from '../types';
import { AlertTriangle, RefreshCw, Calculator, ChevronDown, ChevronRight, Settings, Layout, ClipboardList } from 'lucide-react';
import { GlobalShiftSettings } from './settings/GlobalShiftSettings';
import { JobFlowSettings } from './settings/JobFlowSettings';
import { EngineeredStandardsSettings } from './settings/EngineeredStandardsSettings';

interface ConfigPanelProps {
    config: BufferConfig;
    onChange: (newConfig: BufferConfig) => void;
    suggestedBuffer?: number;
    visibleSections?: ('global' | 'workflow' | 'standards' | 'legacy')[];
}

export function ConfigPanel({ config, onChange, suggestedBuffer, visibleSections }: ConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState<BufferConfig>(config);
    const [isDirty, setIsDirty] = useState(false);

    // Collapsible State
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        global: !visibleSections || visibleSections.includes('global'),
        workflow: !visibleSections || visibleSections.includes('workflow'),
        standards: !visibleSections || visibleSections.includes('standards'),
        legacy: !visibleSections || visibleSections.includes('legacy')
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Ensure defaults are populated if missing (for legacy configs)
    useEffect(() => {
        let needsUpdate = false;
        let updatedConfig = { ...config };

        if (!updatedConfig.globalShiftParams) {
            updatedConfig.globalShiftParams = DEFAULT_BUFFER_CONFIG.globalShiftParams;
            needsUpdate = true;
        }
        if (!updatedConfig.engineeredStandards) {
            updatedConfig.engineeredStandards = DEFAULT_BUFFER_CONFIG.engineeredStandards;
            needsUpdate = true;
        }

        if (needsUpdate) {
            setLocalConfig(updatedConfig);
        } else {
            setLocalConfig(config);
        }
        setIsDirty(false);
    }, [config]);

    // Handle Deep Changes
    const handleGlobalChange = (newParams: any) => {
        const newConfig = { ...localConfig, globalShiftParams: newParams };
        setLocalConfig(newConfig);
        setIsDirty(true);
    };

    const handleFlowChange = (newFlows: any) => {
        const newConfig = {
            ...localConfig,
            engineeredStandards: {
                ...localConfig.engineeredStandards!,
                jobFlows: newFlows
            }
        };
        setLocalConfig(newConfig);
        setIsDirty(true);
    };

    const handleStandardsChange = (newCards: any) => {
        const newConfig = {
            ...localConfig,
            engineeredStandards: {
                ...localConfig.engineeredStandards!,
                cards: newCards
            }
        };
        setLocalConfig(newConfig);
        setIsDirty(true);
    };

    const handleChange = (key: keyof BufferConfig, value: string | boolean) => {
        if (typeof value === 'boolean') {
            const newConfig = { ...localConfig, [key]: value };
            setLocalConfig(newConfig);
            setIsDirty(JSON.stringify(newConfig) !== JSON.stringify(config));
            return;
        }

        // String config (Method)
        if (key === 'flowCalculationMethod') {
            const newConfig = { ...localConfig, [key]: value };
            setLocalConfig(newConfig as BufferConfig);
            setIsDirty(JSON.stringify(newConfig) !== JSON.stringify(config));
            return;
        }

        // Metric/Number config
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
            const newConfig = { ...localConfig, [key]: num };
            setLocalConfig(newConfig);
            setIsDirty(JSON.stringify(newConfig) !== JSON.stringify(config));
        }
    };


    const handleApply = () => {
        onChange(localConfig);
        setIsDirty(false);
    };

    // Helper for collapsible header
    const SectionHeader = ({ id, title, icon: Icon }: { id: string, title: string, icon: any }) => (
        <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                <Icon className="w-5 h-5 text-blue-500" />
                {title}
            </div>
            {openSections[id] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>
    );

    return (
        <div className="space-y-6">

            {/* Section A: Global Shift Parameters */}
            {(!visibleSections || visibleSections.includes('global')) && (
                <div className="space-y-2">
                    <SectionHeader id="global" title="A. Global Shift Parameters" icon={Settings} />
                    {openSections['global'] && localConfig.globalShiftParams && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <GlobalShiftSettings
                                params={localConfig.globalShiftParams}
                                onChange={handleGlobalChange}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Section B: Job Type Workflow Map */}
            {(!visibleSections || visibleSections.includes('workflow')) && (
                <div className="space-y-2">
                    <SectionHeader id="workflow" title="B. Job Type Workflow Map" icon={Layout} />
                    {openSections['workflow'] && localConfig.engineeredStandards && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <JobFlowSettings
                                flows={localConfig.engineeredStandards.jobFlows}
                                onChange={handleFlowChange}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Section C: Engineered Standards */}
            {(!visibleSections || visibleSections.includes('standards')) && (
                <div className="space-y-2">
                    <SectionHeader id="standards" title="C. Engineered Standards (Calculation Groups)" icon={ClipboardList} />
                    {openSections['standards'] && localConfig.engineeredStandards && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <EngineeredStandardsSettings
                                cards={localConfig.engineeredStandards.cards}
                                onChange={handleStandardsChange}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Legacy / Advanced Config */}
            {(!visibleSections || visibleSections.includes('legacy')) && (
                <div className="space-y-2">
                    <SectionHeader id="legacy" title="Advanced / Legacy Config" icon={AlertTriangle} />
                    {openSections['legacy'] && (
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {/* Intra-Job Buffer */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                                    Intra-Job Buffer (min)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={localConfig.intraJobBuffer}
                                    onChange={(e) => handleChange('intraJobBuffer', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Job Transition Buffer */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                                    Job Transition Buffer (min)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={localConfig.jobTransitionBuffer}
                                    onChange={(e) => handleChange('jobTransitionBuffer', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">2D Layout Used?</span>
                                <button
                                    onClick={() => handleChange('is2DLayoutUsed', !localConfig.is2DLayoutUsed)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localConfig.is2DLayoutUsed ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.is2DLayoutUsed ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Engineered Stds Used?</span>
                                <button
                                    onClick={() => handleChange('isEngineeredStandardsUsed', !localConfig.isEngineeredStandardsUsed)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localConfig.isEngineeredStandardsUsed ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.isEngineeredStandardsUsed ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Flow Analysis */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-2 mt-2">Flow Analysis Params</label>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 dark:text-slate-500">Method</label>
                                        <select
                                            value={localConfig.flowCalculationMethod ?? 'interval'}
                                            onChange={(e) => handleChange('flowCalculationMethod', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="interval">Dynamic Flow (System Rate)</option>
                                            <option value="user_daily_average">Grand Avg Per User (User Rate)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-500 dark:text-slate-500">Bucket Interval (min)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={localConfig.flowBucketInterval ?? 10}
                                            onChange={(e) => handleChange('flowBucketInterval', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Utilization Cap */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-400 mb-1">
                                    Utilization Cap (Top N)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={localConfig.utilizationCap ?? 5}
                                    onChange={(e) => handleChange('utilizationCap', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-[#0b0d10] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Alert Threshold */}
                            <div>
                                <label className="block text-xs font-medium text-rose-700 mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Alert Threshold (min)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={localConfig.alertThreshold}
                                    onChange={(e) => handleChange('alertThreshold', e.target.value)}
                                    className="w-full px-3 py-2 border border-rose-200 bg-rose-50/50 dark:bg-rose-900/20 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-rose-900 dark:text-rose-200"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer / Apply */}
            <div className="sticky bottom-0 bg-white dark:bg-[#111418] p-4 border-t border-slate-200 dark:border-slate-800 -mx-4 -mb-4 mt-6">
                <button
                    onClick={handleApply}
                    disabled={!isDirty}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${isDirty
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg transform hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
                        }`}
                >
                    <RefreshCw className={`w-4 h-4 ${isDirty ? 'animate-spin-once' : ''}`} />
                    {isDirty ? 'Save Configuration & Recalculate' : 'Settings Up to Date'}
                </button>
            </div>
        </div>
    );
}
