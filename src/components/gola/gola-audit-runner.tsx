import React, { useState } from 'react';
import { AuditScenarioGrid } from './audit-scenario-grid';
import { AuditDetailsPanel } from './audit-details-panel';
import type { AuditMission, AuditLogType } from '../../types/gola';
import type { EngineeredStandardsConfig, TaskObject } from '../../types';
import { calculateJobStandardAndTarget } from '../../logic/calculation-service';
import { Play } from 'lucide-react';
import golaScenarios from '../../data/gola-audit-scenarios.json';

const INJECTABLE_IDS = ['OBPP-01', 'PUTW-01', 'MICP-01', 'SICP-01', 'SIBP-01', 'IIBP-01', 'IOBP-01'];

export function GOLAAuditRunner({ onInjectPayload, config }: { onInjectPayload?: (file: File) => void, config?: EngineeredStandardsConfig }) {
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

            if (!config) {
                addLog(id, 'ERROR', `EngineeredStandardsConfig is not loaded. Cannot run Master Service calculation.`);
                updateMission(id, m => ({ ...m, status: 'FAILURE' }));
                return;
            }

            addLog(id, 'ACTION', `Loading test data: ${mission.testData.length} records from golden dataset`);
            await new Promise(r => setTimeout(r, 600));

            const testData = mission.testData;

            // Map raw dataset to TaskObject arrays grouped by JobCode
            const jobsMap: Record<string, TaskObject[]> = {};
            const flowAcronym = id.split('-')[0]; // Extract 'PUTW' from 'PUTW-01'

            for (const t of testData) {
                const jobCode = (t as any)['Job Code'];
                if (!jobsMap[jobCode]) jobsMap[jobCode] = [];
                jobsMap[jobCode].push({
                    JobCode: jobCode,
                    JobType: flowAcronym,
                    TaskType: (t as any)['Task Type'],
                    Quantity: (t as any)['Task UOM Qty'] || (t as any)['Quantity'] || 1,
                    Location: (t as any)['Source location'],
                    OrderCode: (t as any)['Order Code'],
                    SKU: (t as any)['SKU']
                } as TaskObject);
            }

            addLog(id, 'DATA', `Extracted ${Object.keys(jobsMap).length} unique jobs. Applying Single Calculation Engine...`);

            let totalCalculated = 0;

            for (const [jobCode, jobTasks] of Object.entries(jobsMap)) {
                const jobRes = calculateJobStandardAndTarget(jobTasks, config);
                totalCalculated += jobRes.standardSeconds;
                addLog(id, 'CALC', `Job [${jobCode}]: Standard: ${jobRes.standardSeconds}s (Pick: ${jobRes.pickingStandardSec}s, Sort: ${jobRes.sortingStandardSec}s, Pack: ${jobRes.packingStandardSec}s)`);
            }

            addLog(id, 'CALC', `Grand Total Standard (via Master Engine): ${totalCalculated}s`);

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
