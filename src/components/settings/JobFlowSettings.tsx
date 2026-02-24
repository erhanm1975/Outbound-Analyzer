import React from 'react';
import type { JobFlowConfig, FlowClass } from '../../types';

interface Props {
    flows: JobFlowConfig[];
    onChange: (flows: JobFlowConfig[]) => void;
}

export function JobFlowSettings({ flows, onChange }: Props) {
    const handleFlowChange = (index: number, newClass: FlowClass) => {
        const newFlows = [...flows];
        newFlows[index] = { ...newFlows[index], flowClass: newClass };
        onChange(newFlows);
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-[#111418] rounded-lg border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Job Type Workflow Map</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Acronym</th>
                            <th className="px-4 py-3">Full Name</th>
                            <th className="px-4 py-3">Flow Class</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {flows.map((flow, idx) => (
                            <tr key={flow.acronym}>
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{flow.acronym}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{flow.fullName}</td>
                                <td className="px-4 py-3">
                                    <select
                                        value={flow.flowClass}
                                        onChange={(e) => handleFlowChange(idx, e.target.value as FlowClass)}
                                        className="w-full px-2 py-1 bg-white dark:bg-[#0b0d10] border border-slate-300 dark:border-slate-800 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
                                    >
                                        <option value="Standard">Standard</option>
                                        <option value="Mass">Mass</option>
                                        <option value="Put-Wall">Put-Wall</option>
                                        <option value="IIBP">IIBP</option>
                                        <option value="IOBP">IOBP</option>
                                        <option value="SIBP">SIBP</option>
                                        <option value="MICP">MICP</option>
                                        <option value="SICP">SICP</option>
                                        <option value="OBPP">OBPP</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
