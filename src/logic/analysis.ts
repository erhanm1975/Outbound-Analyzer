import { differenceInMinutes, differenceInSeconds, compareAsc } from 'date-fns';
import {
    type ShiftRecord,
    type BufferConfig,
    type EnrichedShiftRecord,
    type AggregatedStats,
    type HealthStats,
    type TelemetryLog
} from '../types';

export interface AnalysisResult {
    records: EnrichedShiftRecord[];
    stats: AggregatedStats;
    health: HealthStats;
    telemetry: TelemetryLog[];
    roleDiagnostics: { // NEW
        pickers: { user: string; reason: string }[];
        packers: { user: string; reason: string }[];
    };
}

export function analyzeShift(data: ShiftRecord[], config: BufferConfig): AnalysisResult {
    // 1. Sort: User ASC -> Start ASC
    const sorted = [...data].sort((a, b) => {
        if (a.User < b.User) return -1;
        if (a.User > b.User) return 1;
        return compareAsc(a.Start, b.Start);
    });

    const enriched: EnrichedShiftRecord[] = [];
    const telemetry: TelemetryLog[] = [];

    let totalVolume = 0;
    let totalDirectTimeSec = 0;
    let totalAllowedBufferMin = 0;
    let totalLostTimeMin = 0;
    let totalTasks = 0;

    // We need to track unique active users? No, aggregated stats usually sum everything.
    // Utilization is (Sum Direct Time / Total Time).
    // But usually 3PL metrics are: Direct + Indirect = Total Hours.
    // Here we only have Task Execution Data. We don't have "Clock In/Out".
    // So "Total Shift Span" must be inferred from First Start to Last Finish per user.

    // Let's track per-user spans to sum up "Total Active Hours" (Shift Span).
    const userSpans: Record<string, { start: Date; finish: Date }> = {};

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const prev = i > 0 ? sorted[i - 1] : null;

        // Track span
        if (!userSpans[current.User]) {
            userSpans[current.User] = { start: current.Start, finish: current.Finish };
        } else {
            // Expand span
            if (current.Start < userSpans[current.User].start) userSpans[current.User].start = current.Start;
            if (current.Finish > userSpans[current.User].finish) userSpans[current.User].finish = current.Finish;
        }

        // Task Duration
        const durationSec = differenceInSeconds(current.Finish, current.Start);
        totalDirectTimeSec += Math.max(0, durationSec);
        totalVolume += current.Quantity;
        totalTasks++;

        let rawGap = 0;
        let netGap = 0;
        let gapType: EnrichedShiftRecord['gapType'] = 'FIRST_TASK';
        let isAnomaly = false;

        // 2. Gap Logic
        if (prev && prev.User === current.User) {
            // Same user, check gap
            const gapMin = differenceInMinutes(current.Start, prev.Finish);
            rawGap = Math.max(0, gapMin);

            // Overlap Check (Negative Gap)
            if (gapMin < 0) {
                gapType = 'OVERLAP';
                // Treat as 0 gap, but log it
                rawGap = 0;
                netGap = 0;
                telemetry.push({
                    timestamp: current.Start,
                    user: current.User,
                    type: 'OVERLAP',
                    message: `Overlap detected: Task starts at ${current.Start.toISOString()} but previous finished at ${prev.Finish.toISOString()}`
                });
            } else {
                // Buffer Logic
                const isSameJob = prev.JobCode === current.JobCode;
                const buffer = isSameJob ? config.intraJobBuffer : config.jobTransitionBuffer;
                gapType = isSameJob ? 'INTRA_JOB' : 'TRANSITION';

                totalAllowedBufferMin += Math.min(rawGap, buffer);
                netGap = Math.max(0, rawGap - buffer);

                if (netGap > config.alertThreshold) {
                    isAnomaly = true;
                    // telemetry.push({ ... }); // Optional spam prevention
                }

                totalLostTimeMin += netGap;
            }
        } else {
            gapType = 'FIRST_TASK'; // or User Switch
        }

        enriched.push({
            ...current,
            rawGap,
            netGap,
            gapType,
            isAnomaly
        });
    }

    // Calculate Aggregates
    // Total Shift Span (Sum of all users' (Last Finish - First Start))
    let totalShiftHours = 0;
    Object.values(userSpans).forEach(span => {
        const spanMin = differenceInMinutes(span.finish, span.start);
        totalShiftHours += (spanMin / 60);
    });

    // Distinct Locations (Job + Location) & Physical Locations
    const distinctLocsSet = new Set<string>();
    const physicalLocsSet = new Set<string>(); // NEW
    data.forEach(d => {
        if (d.JobCode && d.Location) {
            distinctLocsSet.add(`${d.JobCode}::${d.Location}`);
            physicalLocsSet.add(d.Location);
        }
    });
    const distinctLocations = distinctLocsSet.size;
    const locationsPerUnit = totalVolume > 0 ? distinctLocations / totalVolume : 0;

    // UPH = Total Qty / Total Shift Hours (Occupancy)
    // Utilization = (Direct Time) / (Total Shift Time) * 100

    const totalDirectTimeHours = totalDirectTimeSec / 3600;

    // --- Helper: Calculate Full Process Stats for any dataset ---
    const calculateProcessStats = (subset: ShiftRecord[]): import('../types').ProcessStats => {
        if (subset.length === 0) return {
            uph: 0, uphPure: 0, uphHourlyFlow: 0,
            tph: 0, utilization: 0, totalVolume: 0,
            totalActiveTime: 0, directTime: 0,
            distinctLocations: 0, locationsPerUnit: 0
        };

        // 1. Volume & Tasks
        const vol = subset.reduce((sum, d) => sum + d.Quantity, 0);
        const taskCount = subset.length;

        // 2. Shift Span (Occupancy) - Recalculate for subset users
        const subsetSpans: Record<string, { start: Date; finish: Date }> = {};
        subset.forEach(d => {
            if (!subsetSpans[d.User]) subsetSpans[d.User] = { start: d.Start, finish: d.Finish };
            else {
                if (d.Start < subsetSpans[d.User].start) subsetSpans[d.User].start = d.Start;
                if (d.Finish > subsetSpans[d.User].finish) subsetSpans[d.User].finish = d.Finish;
            }
        });
        let subsetSpanHours = 0;
        Object.values(subsetSpans).forEach(s => {
            subsetSpanHours += (differenceInMinutes(s.finish, s.start) / 60);
        });

        // 3. Direct Time
        const subsetDirectSec = subset.reduce((sum, d) => sum + Math.max(0, differenceInSeconds(d.Finish, d.Start)), 0);
        const subsetDirectHours = subsetDirectSec / 3600;

        // 4. Locations
        const distinctLocsSet = new Set<string>();
        subset.forEach(d => {
            if (d.JobCode && d.Location) distinctLocsSet.add(`${d.JobCode}::${d.Location}`);
        });
        const distLocs = distinctLocsSet.size;

        // Calc Metrics
        const vUph = subsetSpanHours > 0 ? vol / subsetSpanHours : 0;
        const vUphPure = subsetDirectHours > 0 ? vol / subsetDirectHours : 0;
        const vTph = subsetSpanHours > 0 ? taskCount / subsetSpanHours : 0;
        const vUtil = subsetSpanHours > 0 ? (subsetDirectHours / subsetSpanHours) * 100 : 0;
        const vLocsPerUnit = vol > 0 ? distLocs / vol : 0;

        // Hourly Flow
        const hMap = new Map<string, number>();
        subset.forEach(d => {
            const k = new Date(d.Finish).toISOString().slice(0, 13);
            hMap.set(k, (hMap.get(k) || 0) + d.Quantity);
        });
        let sumFlow = 0;
        hMap.forEach(q => sumFlow += q);
        const vFlow = hMap.size > 0 ? sumFlow / hMap.size : 0;

        return {
            uph: Number(vUph.toFixed(0)),
            uphPure: Number(vUphPure.toFixed(0)),
            uphHourlyFlow: Number(vFlow.toFixed(0)),
            tph: Number(vTph.toFixed(2)),
            utilization: Number(vUtil.toFixed(2)),
            totalVolume: vol,
            totalActiveTime: Number(subsetSpanHours.toFixed(2)),
            directTime: Number((subsetDirectSec / 60).toFixed(2)),
            distinctLocations: distLocs,
            locationsPerUnit: Number(vLocsPerUnit.toFixed(4))
        };
    };

    // Calculate Global
    const globalStats = calculateProcessStats(data);

    // Calculate Picking
    const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
    const pickingStats = calculateProcessStats(pickingData);

    // Calculate Packing
    const packingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));
    const packingStats = calculateProcessStats(packingData);

    const tph = totalShiftHours > 0 ? (totalTasks / totalShiftHours) : 0;
    const utilization = totalShiftHours > 0 ? (totalDirectTimeHours / totalShiftHours) * 100 : 0;

    // --- Health Calculations ---

    // 1. Order Stats
    // 1. Order Stats
    // STRICT RULE: Only consider "Picking" tasks for Single/Multi item calculation.
    // Packing tasks are redundant for this specific metric.
    const ordersMap = new Map<string, number>(); // OrderCode -> Total Quantity
    data.forEach(d => {
        const taskType = (d.TaskType || '').toLowerCase();
        if (taskType.includes('picking')) {
            const currentQty = ordersMap.get(d.OrderCode) || 0;
            ordersMap.set(d.OrderCode, currentQty + d.Quantity);
        }
    });

    const totalOrders = ordersMap.size;
    let singleItemOrders = 0;
    let multiItemOrders = 0;

    ordersMap.forEach(qty => {
        if (qty === 1) singleItemOrders++;
        else multiItemOrders++;
    });

    // 2. Resource Segmentation & 3. Durations
    // 2. Resource Segmentation & 3. Durations
    const pickers = new Set<string>();
    const packers = new Set<string>();
    const allEmployees = new Set<string>();

    // Role Diagnostic Maps: User -> Reason (first match)
    const pickerDebug = new Map<string, string>();
    const packerDebug = new Map<string, string>();

    let totalPickDuration = 0;
    let pickTaskCount = 0;
    let totalPackDuration = 0;
    let packTaskCount = 0;

    // 4. Transitions
    let totalJobTransitionTime = 0;
    let jobTransitionCount = 0;
    let totalGapTime = 0;
    let gapCount = 0;

    enriched.forEach(r => {
        // const jobType = (r.JobType || '').toLowerCase(); // Unused
        const taskType = (r.TaskType || '').toLowerCase();
        // const jobCode = (r.JobCode || '').toLowerCase(); // Unused

        allEmployees.add(r.User);

        // Strict User Rule: Only TaskType determines Picking/Packing
        const isPick = taskType === 'picking';
        const isPack = taskType === 'packing';

        if (isPick) {
            pickers.add(r.User);
            if (!pickerDebug.has(r.User)) {
                pickerDebug.set(r.User, `TaskType: ${r.TaskType}`);
            }
            totalPickDuration += Math.max(0, differenceInSeconds(r.Finish, r.Start));
            pickTaskCount++;
        }

        if (isPack) {
            packers.add(r.User);
            if (!packerDebug.has(r.User)) {
                packerDebug.set(r.User, `TaskType: ${r.TaskType}`);
            }
            totalPackDuration += Math.max(0, differenceInSeconds(r.Finish, r.Start));
            packTaskCount++;
        }

        // Gaps
        if (r.gapType === 'TRANSITION') {
            totalJobTransitionTime += r.rawGap;
            jobTransitionCount++;
        }

        // Travel Proxy (All valid gaps > 0)
        if (r.rawGap > 0 && r.gapType !== 'OVERLAP') {
            totalGapTime += (r.rawGap * 60); // seconds
            gapCount++;
        }
    });

    return {
        records: enriched,
        stats: {
            uph: globalStats.uph,
            uphPure: globalStats.uphPure,
            uphHourlyFlow: globalStats.uphHourlyFlow,
            picking: pickingStats,
            packing: packingStats,
            tph: Number(tph.toFixed(2)),
            utilization: Number(utilization.toFixed(2)),
            totalVolume,
            totalTimeOffTask: totalLostTimeMin,
            totalActiveTime: Number(totalShiftHours.toFixed(2)),
            directTime: Number((totalDirectTimeSec / 60).toFixed(2)), // minutes
            allowedBufferTime: totalAllowedBufferMin,
            lostTime: totalLostTimeMin,
            distinctLocations,
            locationsPerUnit: Number(locationsPerUnit.toFixed(4))
        },
        health: {
            totalOrders,
            singleItemOrders,
            multiItemOrders,
            uniqueLocsVisited: distinctLocations,
            totalUniqueLocations: physicalLocsSet.size, // NEW
            totalUnits: totalVolume,
            uniquePickers: pickers.size,
            uniquePackers: packers.size,
            totalDistinctEmployees: allEmployees.size, // NEW
            crossTrainedEmployees: [...pickers].filter(u => packers.has(u)).length, // NEW Intersection
            avgPickDurationSec: pickTaskCount > 0 ? Number((totalPickDuration / pickTaskCount).toFixed(1)) : 0,
            avgPackDurationSec: packTaskCount > 0 ? Number((totalPackDuration / packTaskCount).toFixed(1)) : 0,
            avgJobTransitionMin: jobTransitionCount > 0 ? Number((totalJobTransitionTime / jobTransitionCount).toFixed(1)) : 0,
            avgTravelTimeSec: gapCount > 0 ? Number((totalGapTime / gapCount).toFixed(1)) : 0,
            jobCodeStats: calculateJobCodeStats(data),
            jobTypeStats: calculateJobTypeStats(data),
            taskTypeStats: calculateTaskTypeStats(data),
            waveStats: calculateWaveStats(data) // NEW
        },
        telemetry,
        roleDiagnostics: {
            pickers: Array.from(pickerDebug.entries()).map(([user, reason]) => ({ user, reason })).sort((a, b) => a.user.localeCompare(b.user)),
            packers: Array.from(packerDebug.entries()).map(([user, reason]) => ({ user, reason })).sort((a, b) => a.user.localeCompare(b.user))
        }
    };
}

// --- Helper Functions for Aggregation ---

function calculateJobCodeStats(data: ShiftRecord[]) {
    const map = new Map<string, {
        jobType: string;
        isAI: boolean;
        orders: Set<string>;
        locations: Set<string>;
        skus: Set<string>;
        units: number;
    }>();

    data.forEach(d => {
        if (!map.has(d.JobCode)) {
            map.set(d.JobCode, {
                jobType: d.JobType,
                isAI: !!d.IsAI, // Capture initial AI status
                orders: new Set(),
                locations: new Set(),
                skus: new Set(),
                units: 0
            });
        }
        const entry = map.get(d.JobCode)!;
        entry.orders.add(d.OrderCode);
        entry.locations.add(d.Location); // Assuming 'Location' is unique visit context? Or unique loc string.
        entry.skus.add(d.SKU);
        entry.units += d.Quantity;
        // If any record in the job is marked AI, assume the whole job is AI (or correct based on data consistency)
        if (d.IsAI) entry.isAI = true;
    });

    return Array.from(map.entries()).map(([jobCode, stats]) => ({
        jobCode,
        jobType: stats.jobType,
        totalOrders: stats.orders.size,
        totalLocations: stats.locations.size,
        totalSkus: stats.skus.size,
        totalUnits: stats.units,
        isAI: stats.isAI
    })).sort((a, b) => b.totalUnits - a.totalUnits); // Default sort desc by volume
}

function calculateJobTypeStats(data: ShiftRecord[]) {
    // We strictly need to aggregate by Job Code first, then average by Job Type
    // as per the requirement: "Avg orders IN THE JOB".
    const jobStats = calculateJobCodeStats(data);

    const typeMap = new Map<string, {
        count: number;
        sumOrders: number;
        sumUnits: number;
        sumSkus: number;
    }>();

    jobStats.forEach(job => {
        if (!typeMap.has(job.jobType)) {
            typeMap.set(job.jobType, { count: 0, sumOrders: 0, sumUnits: 0, sumSkus: 0 });
        }
        const entry = typeMap.get(job.jobType)!;
        entry.count++;
        entry.sumOrders += job.totalOrders;
        entry.sumUnits += job.totalUnits;
        entry.sumSkus += job.totalSkus;
    });

    return Array.from(typeMap.entries()).map(([jobType, stats]) => ({
        jobType,
        totalJobs: stats.count,
        avgOrdersPerJob: Number((stats.sumOrders / stats.count).toFixed(1)),
        avgUnitsPerJob: Number((stats.sumUnits / stats.count).toFixed(1)),
        avgSkusPerJob: Number((stats.sumSkus / stats.count).toFixed(1))
    })).sort((a, b) => a.jobType.localeCompare(b.jobType));
}

function calculateTaskTypeStats(data: ShiftRecord[]) {
    // 1. Get Job stats (Totals per Job Code)
    const jobStats = calculateJobCodeStats(data);
    const jobLookup = new Map(jobStats.map(j => [j.jobCode, j]));

    // 2. Map JobCode -> Set of TaskTypes contained in it
    const jobTaskTypes = new Map<string, Set<string>>();
    data.forEach(d => {
        if (!jobTaskTypes.has(d.JobCode)) jobTaskTypes.set(d.JobCode, new Set());
        jobTaskTypes.get(d.JobCode)!.add(d.TaskType || 'Unknown');
    });

    const typeMap = new Map<string, {
        count: number;
        sumOrders: number;
        sumUnits: number;
        sumSkus: number;
    }>();

    // 3. Iterate Jobs, and for EACH Task Type present in that job, contribute to that Type's bucket
    jobTaskTypes.forEach((types, jobCode) => {
        const stats = jobLookup.get(jobCode);
        if (!stats) return;

        types.forEach(type => {
            if (!typeMap.has(type)) {
                typeMap.set(type, { count: 0, sumOrders: 0, sumUnits: 0, sumSkus: 0 });
            }
            const entry = typeMap.get(type)!;
            entry.count++; // Count this Job towards this Task Type
            entry.sumOrders += stats.totalOrders;
            entry.sumUnits += stats.totalUnits;
            entry.sumSkus += stats.totalSkus;
        });
    });

    return Array.from(typeMap.entries()).map(([taskType, stats]) => ({
        taskType,
        avgOrdersPerJob: Number((stats.sumOrders / stats.count).toFixed(1)),
        avgUnitsPerJob: Number((stats.sumUnits / stats.count).toFixed(1)),
        avgSkusPerJob: Number((stats.sumSkus / stats.count).toFixed(1))
    })).sort((a, b) => a.taskType.localeCompare(b.taskType));
}

function calculateWaveStats(data: ShiftRecord[]) {
    // 1. Group Data by JobCode to get per-job stats first
    const jobMap = new Map<string, {
        waveCode: string;
        orderCodes: Set<string>;
        units: number;
    }>();

    data.forEach(d => {
        if (!jobMap.has(d.JobCode)) {
            jobMap.set(d.JobCode, {
                waveCode: d.WaveCode || 'Unknown',
                orderCodes: new Set(),
                units: 0
            });
        }
        const job = jobMap.get(d.JobCode)!;
        job.orderCodes.add(d.OrderCode);
        job.units += d.Quantity;
    });

    // 2. Aggregate Jobs into Waves
    const waveMap = new Map<string, {
        jobCount: number;
        sumOrders: number;
        sumUnits: number;
    }>();

    jobMap.forEach(job => {
        if (!waveMap.has(job.waveCode)) {
            waveMap.set(job.waveCode, {
                jobCount: 0,
                sumOrders: 0,
                sumUnits: 0
            });
        }
        const wave = waveMap.get(job.waveCode)!;
        wave.jobCount++;
        wave.sumOrders += job.orderCodes.size;
        wave.sumUnits += job.units;
    });

    // 3. Calculate Averages
    return Array.from(waveMap.entries()).map(([waveCode, stats]) => ({
        waveCode,
        totalJobs: stats.jobCount,
        avgOrders: Number((stats.sumOrders / stats.jobCount).toFixed(1)),
        avgUnits: Number((stats.sumUnits / stats.jobCount).toFixed(1))
    })).sort((a, b) => {
        // Try to sort numerically if waves are numbers
        const numA = parseInt(a.waveCode);
        const numB = parseInt(b.waveCode);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.waveCode.localeCompare(b.waveCode);
    });
}
// Export return type
export type ShiftAnalysis = ReturnType<typeof analyzeShift>;
