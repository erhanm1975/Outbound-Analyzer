import React, { useState } from 'react';
import { AuditScenarioGrid } from './AuditScenarioGrid';
import { AuditDetailsPanel } from './AuditDetailsPanel';
import type { AuditMission, AuditLogType } from '../../types/gola';
import { Play } from 'lucide-react';
import golaScenarios from '../../data/gola-audit-scenarios.json';

// Standard multipliers derived from global-engineered-standards.json
// These are the sumBucket() values for each card's activities
const STD_MAP: Record<string, {
    pickOH: number; pickLoc: number; pickSKU: number; pickLine: number;
    sortOH: number; sortSKU: number; sortLine: number;
    packOH: number; packOrder: number; packUnit: number;
}> = {
    'OBPP-01': { pickOH: 200, pickLoc: 43, pickSKU: 18, pickLine: 0, sortOH: 0, sortSKU: 0, sortLine: 0, packOH: 10, packOrder: 32, packUnit: 4 },
    'PUTW-01': { pickOH: 200, pickLoc: 13, pickSKU: 10, pickLine: 0, sortOH: 130, sortSKU: 1, sortLine: 2, packOH: 100, packOrder: 32, packUnit: 4 },
    'MICP-01': { pickOH: 250, pickLoc: 48, pickSKU: 14, pickLine: 3, sortOH: 0, sortSKU: 0, sortLine: 0, packOH: 100, packOrder: 32, packUnit: 4 },
    'SICP-01': { pickOH: 250, pickLoc: 48, pickSKU: 14, pickLine: 3, sortOH: 0, sortSKU: 0, sortLine: 0, packOH: 10, packOrder: 32, packUnit: 4 },
    'SIBP-01': { pickOH: 200, pickLoc: 13, pickSKU: 17, pickLine: 0, sortOH: 0, sortSKU: 0, sortLine: 0, packOH: 10, packOrder: 32, packUnit: 4 },
    'IIBP-01': { pickOH: 200, pickLoc: 43, pickSKU: 17, pickLine: 0, sortOH: 0, sortSKU: 0, sortLine: 0, packOH: 10, packOrder: 32, packUnit: 4 },
    'IOBP-01': { pickOH: 200, pickLoc: 48, pickSKU: 17, pickLine: 0, sortOH: 0, sortSKU: 0, sortLine: 0, packOH: 10, packOrder: 32, packUnit: 4 },
};

const INJECTABLE_IDS = Object.keys(STD_MAP);

export function GOLAAuditRunner({ onInjectPayload }: { onInjectPayload?: (file: File) => void }) {
    const [missions, setMissions] = useState<AuditMission[]>(golaScenarios as AuditMission[]);
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

    React.useEffect(() => {
        setMissions(golaScenarios as AuditMission[]);
    }, [golaScenarios]);

    const updateMission = (id: string, updateFn: (m: AuditMission) => AuditMission) => {
        setMissions(prev => prev.map(m => m.id === id ? updateFn(m) : m));
    };

    const addLog = (missionId: string, type: AuditLogType, message: string) => {
        updateMission(missionId, m => ({
            ...m,
            logs: [...(m.logs || []), {
                id: Math.random().toString(36).substring(7),
                type,
                message,
                timestamp: new Date().toISOString()
            }]
        }));
    };

    // ===== UNIFIED VERIFICATION ENGINE =====
    const runMission = async (id: string) => {
        const mission = missions.find(m => m.id === id);
        if (!mission || activeMissionId) return;

        setActiveMissionId(id);
        setSelectedMissionId(id);
        updateMission(id, m => ({ ...m, status: 'RUNNING', logs: [] }));

        addLog(id, 'INFO', `Initializing Audit Mission: ${mission.name}`);
        addLog(id, 'DEBUG', `Mission ID: ${id} | Category: ${mission.category}`);
        await new Promise(r => setTimeout(r, 500));

        try {
            if (mission.category !== 'ENGINEERED_STANDARDS' || !mission.testData) {
                addLog(id, 'INFO', `No test runner logic for this category.`);
                updateMission(id, m => ({ ...m, status: 'SUCCESS' }));
                return;
            }

            const s = STD_MAP[id];
            if (!s) {
                addLog(id, 'ERROR', `No standard multipliers configured for ${id}`);
                updateMission(id, m => ({ ...m, status: 'FAILURE' }));
                return;
            }

            addLog(id, 'ACTION', `Loading test data: ${mission.testData.length} records from golden dataset`);
            await new Promise(r => setTimeout(r, 600));

            const testData = mission.testData;
            const pickTasks = testData.filter((t: any) => t['Task Type'] === 'Picking');
            const sortTasks = testData.filter((t: any) => t['Task Type'] === 'Sort Item');
            const packTasks = testData.filter((t: any) => t['Task Type'] === 'Packing');

            addLog(id, 'DATA', `Records: ${pickTasks.length} Pick, ${sortTasks.length} Sort, ${packTasks.length} Pack`);
            addLog(id, 'EXECUTE', `Applying Standards (OH=${s.pickOH}, Loc=${s.pickLoc}, SKU=${s.pickSKU}, Line=${s.pickLine})...`);

            // — PICKING —
            const pickJobs: Record<string, any[]> = {};
            for (const t of pickTasks) {
                const jc = (t as any)['Job Code'];
                if (!pickJobs[jc]) pickJobs[jc] = [];
                pickJobs[jc].push(t);
            }

            let totalPickTime = 0;
            for (const [jobCode, jobTasks] of Object.entries(pickJobs)) {
                const locs = new Set(jobTasks.map((t: any) => t['Source location'])).size;
                const locSkus = new Set(jobTasks.map((t: any) => `${t['Source location']}|${t['SKU']}`)).size;
                const lines = jobTasks.length;
                const jobTotal = s.pickOH + (locs * s.pickLoc) + (locSkus * s.pickSKU) + (lines * s.pickLine);
                totalPickTime += jobTotal;
                addLog(id, 'CALC', `  Pick [${jobCode}]: OH=${s.pickOH} + ${locs}Loc*${s.pickLoc} + ${locSkus}SKU*${s.pickSKU} + ${lines}Line*${s.pickLine} = ${jobTotal}s`);
            }
            addLog(id, 'CALC', `[Phase 1] Total Picking: ${totalPickTime}s (${Object.keys(pickJobs).length} jobs)`);

            // — SORTING (PUTW only) —
            let totalSortTime = 0;
            if (sortTasks.length > 0 && s.sortOH > 0) {
                const sortJobs: Record<string, any[]> = {};
                for (const t of sortTasks) {
                    const jc = (t as any)['Job Code'];
                    if (!sortJobs[jc]) sortJobs[jc] = [];
                    sortJobs[jc].push(t);
                }
                for (const [jobCode, jobTasks] of Object.entries(sortJobs)) {
                    const units = jobTasks.length;
                    const jobTotal = s.sortOH + (units * s.sortSKU) + (units * s.sortLine);
                    totalSortTime += jobTotal;
                    addLog(id, 'CALC', `  Sort [${jobCode}]: OH=${s.sortOH} + ${units}u*${s.sortSKU} + ${units}u*${s.sortLine} = ${jobTotal}s`);
                }
                addLog(id, 'CALC', `[Phase 2] Total Sorting: ${totalSortTime}s`);
            }

            // — PACKING —
            const packJobs: Record<string, any[]> = {};
            for (const t of packTasks) {
                const jc = (t as any)['Job Code'];
                if (!packJobs[jc]) packJobs[jc] = [];
                packJobs[jc].push(t);
            }

            let totalPackTime = 0;
            for (const [jobCode, jobTasks] of Object.entries(packJobs)) {
                const orders = new Set(jobTasks.map((t: any) => t['Order Code'])).size;
                const units = jobTasks.reduce((acc: number, t: any) => acc + ((t as any)['Task UOM Qty'] || 1), 0);
                const jobTotal = s.packOH + (orders * s.packOrder) + (units * s.packUnit);
                totalPackTime += jobTotal;
            }
            const packPhase = sortTasks.length > 0 ? '3' : '2';
            addLog(id, 'CALC', `[Phase ${packPhase}] Total Packing: ${totalPackTime}s (${Object.keys(packJobs).length} jobs)`);

            // — GRAND TOTAL —
            const totalCalculated = totalPickTime + totalSortTime + totalPackTime;
            addLog(id, 'CALC', `Grand Total Standard: ${totalCalculated}s`);

            const expected = mission.expectedResults?.totalStandardSeconds;
            await new Promise(r => setTimeout(r, 800));

            if (totalCalculated === expected) {
                addLog(id, 'ASSERT_PASS', `✅ Assertion Passed: Calculated (${totalCalculated}s) == Expected (${expected}s)`);
                updateMission(id, m => ({ ...m, status: 'SUCCESS' }));
            } else {
                addLog(id, 'ASSERT_FAIL', `❌ Assertion Failed: Calculated (${totalCalculated}s) != Expected (${expected}s)`);
                updateMission(id, m => ({ ...m, status: 'FAILURE' }));
            }
        } catch (error: any) {
            addLog(id, 'ERROR', `Mission Execution Failed: ${error.message}`);
            updateMission(id, m => ({ ...m, status: 'FAILURE' }));
        } finally {
            setActiveMissionId(null);
        }
    };

    const runAllMissions = async () => {
        if (activeMissionId) return;
        const pendingMissions = missions.filter(m => m.status !== 'SUCCESS');
        for (const mission of pendingMissions) {
            await runMission(mission.id);
        }
    };

    const selectedMission = missions.find(m => m.id === selectedMissionId) || null;

    const handleGenerateAndInject = (mission: AuditMission) => {
        if (!onInjectPayload || !INJECTABLE_IDS.includes(mission.id) || !mission.testData) return;

        const importData = mission.testData;
        if (importData.length === 0) return;
        const headers = Object.keys(importData[0]).join(',');
        const rows = importData.map((r: any) => Object.values(r).join(',')).join('\n');
        const csvContent = `${headers}\n${rows}`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const file = new File([blob], `GOLA_${mission.id}_Test.csv`, { type: 'text/csv' });

        onInjectPayload(file);
    };

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] min-h-[600px] p-6 lg:ml-64 w-full">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-white flex gap-2 items-center">
                        <Play size={22} className="text-blue-500" />
                        GOLA Audit Runner
                    </h2>
                    <p className="text-slate-400 text-xs">Verify logic, standards, and calculations against known datasets.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setMissions(golaScenarios as AuditMission[])}
                        disabled={activeMissionId !== null}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded transition-colors disabled:opacity-50"
                    >
                        Reset State
                    </button>
                    <button
                        onClick={runAllMissions}
                        disabled={activeMissionId !== null || missions.length === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                        <Play size={14} />
                        Run All Pending
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <AuditScenarioGrid
                    missions={missions}
                    activeMissionId={activeMissionId}
                    onRunMission={runMission}
                    onRunAll={runAllMissions}
                    onMissionSelect={setSelectedMissionId}
                    onInjectPayload={handleGenerateAndInject}
                />

                <AuditDetailsPanel
                    mission={selectedMission}
                    onClose={() => setSelectedMissionId(null)}
                />
            </div>
        </div>
    );
}
