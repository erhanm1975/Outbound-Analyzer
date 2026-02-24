import React from 'react';
import { Play } from 'lucide-react';
import type { AuditMission } from '../../types/gola';

interface AuditScenarioGridProps {
    missions: AuditMission[];
    activeMissionId: string | null;
    onRunMission: (id: string) => void;
    onRunAll: () => void;
    onMissionSelect: (missionId: string) => void;
    onInjectPayload?: (mission: AuditMission) => void;
}

export function AuditScenarioGrid({
    missions,
    activeMissionId,
    onRunMission,
    onRunAll,
    onMissionSelect,
    onInjectPayload
}: AuditScenarioGridProps) {

    // Simple sorting to approximate Workload Dashboard
    const sortedMissions = [...missions].sort((a, b) => {
        const getScore = (s: string) => {
            if (s === 'FAILURE') return 0;
            if (s === 'SUCCESS') return 1;
            return 2;
        };
        const scoreA = getScore(a.status);
        const scoreB = getScore(b.status);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.id.localeCompare(a.id);
    });

    return (
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-semibold text-sm">Scenario Overview</h3>
                <div className="flex gap-2">
                    <button
                        onClick={onRunAll}
                        disabled={activeMissionId !== null}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors flex items-center gap-1
                                    ${activeMissionId ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                        <Play size={14} />
                        {activeMissionId ? 'Running' : 'Run All'}
                    </button>
                </div>
            </div>

            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex-1">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-xs text-slate-400 capitalize border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3 font-medium">ID</th>
                            <th className="px-4 py-3 font-medium">Mission Scenario</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedMissions.map((mission) => (
                            <tr
                                key={mission.id}
                                onClick={() => onMissionSelect(mission.id)}
                                className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${activeMissionId === mission.id ? 'bg-slate-800/30' : ''}`}
                            >
                                <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-blue-400 text-xs">{mission.id}</td>
                                <td className="px-4 py-3 font-medium text-slate-200">{mission.name}</td>
                                <td className="px-4 py-3">
                                    <span className="text-[10px] text-slate-400 font-mono border border-slate-700 px-2 py-0.5 rounded uppercase">
                                        {mission.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-bold">
                                    {mission.status === 'SUCCESS' && <span className="text-green-500">PASS</span>}
                                    {mission.status === 'FAILURE' && <span className="text-red-500">FAIL</span>}
                                    {mission.status !== 'SUCCESS' && mission.status !== 'FAILURE' && <span className="text-slate-500">{mission.status}</span>}
                                </td>
                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                    {mission.status === 'SUCCESS' && ['OBPP-01', 'PUTW-01', 'SICP-01', 'MICP-01', 'IIBP-01', 'SIBP-01', 'IOBP-01'].includes(mission.id) && onInjectPayload && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInjectPayload(mission);
                                            }}
                                            title="Inject to Happy Path"
                                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRunMission(mission.id);
                                        }}
                                        disabled={activeMissionId !== null}
                                        title="Run Mission"
                                        className={`p-1.5 rounded transition-colors inline-flex ${activeMissionId ? 'text-slate-600 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/10'}`}
                                    >
                                        <Play size={16} className={activeMissionId === mission.id ? 'animate-pulse' : ''} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sortedMissions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    No missions loaded
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
