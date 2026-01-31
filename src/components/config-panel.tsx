import { useState, useEffect } from 'react';
import { type BufferConfig } from '../types';
import { AlertTriangle, RefreshCw } from 'lucide-react';


interface ConfigPanelProps {
    config: BufferConfig;
    onChange: (newConfig: BufferConfig) => void;
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState<BufferConfig>(config);
    const [isDirty, setIsDirty] = useState(false);

    // Sync if parent updates (e.g. reset)
    useEffect(() => {
        setLocalConfig(config);
        setIsDirty(false);
    }, [config]);

    const handleChange = (key: keyof BufferConfig, value: string) => {
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

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Intra-Job Buffer (min)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={localConfig.intraJobBuffer}
                        onChange={(e) => handleChange('intraJobBuffer', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Allowance between tasks of same Job Code</p>
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
