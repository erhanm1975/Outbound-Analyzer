import { useState, useEffect } from 'react';
import { type BufferConfig } from '../types';
import { AlertTriangle, RefreshCw, Calculator } from 'lucide-react';


interface ConfigPanelProps {
    config: BufferConfig;
    onChange: (newConfig: BufferConfig) => void;
    suggestedBuffer?: number;
}

export function ConfigPanel({ config, onChange, suggestedBuffer }: ConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState<BufferConfig>(config);
    const [isDirty, setIsDirty] = useState(false);

    // Sync if parent updates (e.g. reset)
    useEffect(() => {
        setLocalConfig(config);
        setIsDirty(false);
    }, [config]);

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
            // Simple dirty check
            setIsDirty(JSON.stringify(newConfig) !== JSON.stringify(config));
        }
    };

    const handleApply = () => {
        onChange(localConfig);
        setIsDirty(false);
    };

    const applySuggestion = () => {
        if (suggestedBuffer !== undefined) {
            const newConfig = {
                ...localConfig,
                intraJobBuffer: suggestedBuffer,
                isIntraJobBufferAutoCalculated: true
            };
            setLocalConfig(newConfig);
            setIsDirty(true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                        <span>Intra-Job Buffer (min)</span>
                        {config.isIntraJobBufferAutoCalculated && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                Auto-calculated
                            </span>
                        )}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min="0"
                            value={localConfig.intraJobBuffer}
                            onChange={(e) => {
                                handleChange('intraJobBuffer', e.target.value);
                                // Mark as user-modified when manually changed
                                const newConfig = { ...localConfig, intraJobBuffer: parseInt(e.target.value, 10), isIntraJobBufferAutoCalculated: false };
                                setLocalConfig(newConfig);
                                setIsDirty(JSON.stringify(newConfig) !== JSON.stringify(config));
                            }}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${config.isIntraJobBufferAutoCalculated
                                ? 'border-blue-300 bg-blue-50/50'
                                : 'border-slate-300'
                                }`}
                        />
                        {suggestedBuffer !== undefined && (
                            <button
                                onClick={applySuggestion}
                                title={`Auto-calculate: ${suggestedBuffer} min`}
                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                                <Calculator className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                        {config.isIntraJobBufferAutoCalculated
                            ? 'Calculated from median job cycle time (editable)'
                            : 'Allowance between tasks of same Job Code'}
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Job Transition Buffer (min)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={localConfig.jobTransitionBuffer}
                        onChange={(e) => handleChange('jobTransitionBuffer', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Allowance when switching Job Codes</p>
                </div>
                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Operational Configuration
                    </label>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">2D Layout Used?</span>
                        <button
                            onClick={() => handleChange('is2DLayoutUsed', !localConfig.is2DLayoutUsed)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localConfig.is2DLayoutUsed ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.is2DLayoutUsed ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Engineered Stds Used?</span>
                        <button
                            onClick={() => handleChange('isEngineeredStandardsUsed', !localConfig.isEngineeredStandardsUsed)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localConfig.isEngineeredStandardsUsed ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.isEngineeredStandardsUsed ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Flow Analysis Params
                    </label>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500">Method</label>
                        <select
                            value={localConfig.flowCalculationMethod ?? 'interval'}
                            onChange={(e) => handleChange('flowCalculationMethod', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="interval">Dynamic Flow (System Rate)</option>
                            <option value="user_daily_average">Grand Avg Per User (User Rate)</option>
                        </select>
                        <p className="text-[9px] text-slate-400">
                            {localConfig.flowCalculationMethod === 'user_daily_average'
                                ? 'Avg(User Daily Avgs). Agnostic to load.'
                                : 'Avg(Interval Rate). Weighted by flow.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-500 mb-1">
                            Bucket Interval (min)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={localConfig.flowBucketInterval ?? 10}
                            onChange={(e) => handleChange('flowBucketInterval', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {localConfig.flowCalculationMethod !== 'user_daily_average' && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Exclude Empty Buckets?</span>
                            <button
                                onClick={() => handleChange('flowExcludeEmpty', !(localConfig.flowExcludeEmpty ?? true))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localConfig.flowExcludeEmpty ?? true ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(localConfig.flowExcludeEmpty ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-medium text-rose-700 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Alert Threshold (min)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={localConfig.alertThreshold}
                        onChange={(e) => handleChange('alertThreshold', e.target.value)}
                        className="w-full px-3 py-2 border border-rose-200 bg-rose-50/50 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-rose-900"
                    />
                    <p className="text-[10px] text-rose-500 mt-1">Flag anomalies exceeding this variance</p>
                </div>
            </div>

            <button
                onClick={handleApply}
                disabled={!isDirty}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${isDirty
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:-translate-y-0.5'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
            >
                <RefreshCw className={`w-4 h-4 ${isDirty ? 'animate-spin-once' : ''}`} />
                {isDirty ? 'Recalculate Analysis' : 'Settings Up to Date'}
            </button>
        </div>
    );
}
