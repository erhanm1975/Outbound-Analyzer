import { differenceInMinutes, differenceInSeconds, compareAsc, format } from 'date-fns';
import {
    type ShiftRecord,
    type BufferConfig,
    type EnrichedShiftRecord,
    type AggregatedStats,
    type HealthStats,
    type TelemetryLog,
    type JobTimingMetrics,
    type AdvancedMetrics, // NEW
    type AnalysisResult
} from '../types';

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

    // --- Pass 0: Batch Normalization ---
    // User Request: Group tasks from same location/sku at same time and equally separate duration.
    const batchAdjustments = new Map<number, number>(); // Index -> Adjusted Duration
    let batchStartIdx = 0;

    for (let i = 1; i <= sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = i < sorted.length ? sorted[i] : null;

        // Check continuity: Same User, Job, Loc, SKU
        const isBatch = curr &&
            curr.User === prev.User &&
            curr.JobCode === prev.JobCode &&
            curr.Location === prev.Location &&
            curr.SKU === prev.SKU;
        // Note: Timestamps are naturally consecutive due to sort.

        if (!isBatch) {
            // End of batch (from batchStartIdx to i-1)
            const count = i - batchStartIdx;
            if (count > 1) {
                const batchFirst = sorted[batchStartIdx]; // First task (contains Travel)
                const batchLast = sorted[i - 1]; // Last task (contains end of processing)

                // Total Batch Duration: From Start of First to Finish of Last
                // This captures the single Travel + N Processing events.
                const totalDur = Math.max(0, differenceInSeconds(batchLast.Finish, batchFirst.Start));

                // "Equally separate the duration"
                const avgDur = totalDur / count;

                for (let k = batchStartIdx; k < i; k++) {
                    batchAdjustments.set(k, avgDur);
                }
            }
            batchStartIdx = i; // Reset start
        }
    }

    // --- Pass 0.5: Sorting Block Normalization ---
    // User Request: For Sorting tasks, if duration is zero, spread total sorting span across count.
    let jobStartIdx = 0;
    for (let i = 1; i <= sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = i < sorted.length ? sorted[i] : null;

        // Group by User & Job
        const isSameJob = curr && curr.User === prev.User && curr.JobCode === prev.JobCode;

        if (!isSameJob) {
            // End of Job Block (from jobStartIdx to i-1)
            const sortingIndices: number[] = [];

            for (let k = jobStartIdx; k < i; k++) {
                if (sorted[k].TaskType.toLowerCase().includes('sort')) {
                    sortingIndices.push(k);
                }
            }

            if (sortingIndices.length > 1) {
                // Check if specialized logic needed (is any duration zero?)
                const hasZero = sortingIndices.some(idx => {
                    const t = sorted[idx];
                    return differenceInSeconds(t.Finish, t.Start) === 0;
                });

                if (hasZero) {
                    // Logic: (diff(last task finish - first task start) - breaks) / count
                    // Since sorted by Start, minStart is at index 0 of sortingIndices
                    const minStart = sorted[sortingIndices[0]].Start;
                    let maxFinish = sorted[sortingIndices[0]].Finish;
                    let totalBreakSec = 0;

                    sortingIndices.forEach((idx, i) => {
                        const currTask = sorted[idx];
                        if (currTask.Finish > maxFinish) maxFinish = currTask.Finish;

                        if (i > 0) {
                            const prevTask = sorted[sortingIndices[i - 1]];
                            const gap = differenceInSeconds(currTask.Start, prevTask.Finish);
                            if (gap > 300) { // > 5 mins is a break
                                totalBreakSec += gap;
                            }
                        }
                    });

                    const rawSpan = Math.max(0, differenceInSeconds(maxFinish, minStart));
                    const effectiveSpan = Math.max(0, rawSpan - totalBreakSec);
                    const avgDur = effectiveSpan / sortingIndices.length;

                    sortingIndices.forEach(idx => {
                        batchAdjustments.set(idx, avgDur);
                    });
                }
            }
            jobStartIdx = i; // Reset start
        }
    }

    // --- Pass 1: Calibration (Calculate Picking GSPT) ---
    const sameLocDurations: number[] = [];
    sorted.forEach((d, idx) => {
        if (idx === 0) return;
        // Strict GSPT: Only for PICKING tasks
        if (!d.TaskType.toLowerCase().includes('pick')) return;

        const p = sorted[idx - 1];
        // Same User, Same Job, Same Location (Consecutive Pick)
        if (p.User === d.User && p.JobCode === d.JobCode && p.Location === d.Location) {
            // Use Adjusted Duration if Batch, else Raw
            const rawDur = Math.max(0, differenceInSeconds(d.Finish, d.Start));
            const dur = batchAdjustments.has(idx) ? batchAdjustments.get(idx)! : rawDur;

            // Filter out 0-duration artifacts (unless adjusted to >0)
            if (dur > 0) {
                sameLocDurations.push(dur);
            }
        }
    });
    sameLocDurations.sort((a, b) => a - b);

    // Significance: >= 30 records OR >= 1% of total dataset
    const thresholdCount = Math.max(30, Math.ceil(sorted.length * 0.01));
    let PickingGSPT: number | null = null;

    if (sameLocDurations.length >= thresholdCount) {
        // Use P10 (10th Percentile) for "Pure Process Time"
        // Median includes too much "fumble/micro-idle" time. P10 represents "Clean Execution".
        const p10Index = Math.floor(sameLocDurations.length * 0.10);
        PickingGSPT = sameLocDurations[p10Index];
        console.log(`[Picking GSPT] Calculated (P10): ${PickingGSPT}s from ${sameLocDurations.length} same-location picking tasks`);
    } else {
        console.log(`[Picking GSPT] Insufficient data: ${sameLocDurations.length} same-location picking tasks (need ${thresholdCount})`);
    }

    // --- Pass 2: Main Analysis ---
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const prev = i > 0 ? sorted[i - 1] : null;

        // Track span
        if (!userSpans[current.User]) {
            userSpans[current.User] = { start: current.Start, finish: current.Finish };
        } else {
            if (current.Start < userSpans[current.User].start) userSpans[current.User].start = current.Start;
            if (current.Finish > userSpans[current.User].finish) userSpans[current.User].finish = current.Finish;
        }

        // 1. Task Duration (Process + Travel)
        // Use Adjusted Duration if Batch
        const rawDurationSec = Math.max(0, differenceInSeconds(current.Finish, current.Start));
        const taskDurationSec = batchAdjustments.has(i) ? batchAdjustments.get(i)! : rawDurationSec;

        let processTimeSec = 0;
        let travelTimeSec = 0;
        let interJobGapSec = 0;

        const isPicking = current.TaskType.toLowerCase().includes('pick');

        // 2. Inter-Job Gap (Init/Finalize) - Only for Picking?
        // User said "interjob + travel + processing is just for picking tasks".
        // Use isPicking guard for Gap too?
        // If current is Picking, we check gap. If current is Packing, we might ignore gap?
        // Let's implement the Gap check generally but only flagging "Travel" split if Picking.
        // Actually, user said "Interjob... is just for picking". So for Packing, Gap = 0?

        let gapType: EnrichedShiftRecord['gapType'] = 'FIRST_TASK';
        let rawGap = 0;

        if (prev && prev.User === current.User) {
            // For Batches, internal gap is 0 or handled by adjustment.
            // External gap (Transition) is real.

            // Note: If this task is part of a batch (but not the first one), 
            // the Logic below considers 'prev' which is the previous task in the batch.
            // Since they have same Job, gap is INTRA_JOB.
            // But strict timestamp gap might be 0.

            rawGap = Math.max(0, differenceInSeconds(current.Start, prev.Finish));
            const isSameJob = prev.JobCode === current.JobCode;

            if (!isSameJob) {
                gapType = 'TRANSITION';
                // Count InterJobGap for ALL task types (Packing/Sorting included)
                interJobGapSec = rawGap;
            } else {
                gapType = 'INTRA_JOB';
            }
        }

        // 3. Decompose Task Duration (Step 2A: Hybrid Model)
        if (isPicking) {
            // Picking GSPT Logic
            if (PickingGSPT !== null) {
                // Method 1: Calculated Split
                processTimeSec = PickingGSPT;
                travelTimeSec = Math.max(0, taskDurationSec - PickingGSPT);
                // Edge case: If task was faster than GSPT?
                if (taskDurationSec < PickingGSPT) {
                    processTimeSec = taskDurationSec;
                    travelTimeSec = 0;
                }
            } else {
                // Method 2: Heuristic Fallback
                const isSameLoc = prev && prev.User === current.User && prev.JobCode === current.JobCode && prev.Location === current.Location;
                if (isSameLoc) {
                    travelTimeSec = taskDurationSec * 0.05;
                    processTimeSec = taskDurationSec * 0.95;
                } else {
                    travelTimeSec = taskDurationSec * 0.70;
                    processTimeSec = taskDurationSec * 0.30;
                }
            }
        } else {
            // Non-Picking: No Travel split, all is Process
            processTimeSec = taskDurationSec;
            travelTimeSec = 0;
        }

        totalDirectTimeSec += taskDurationSec; // Still track total active execution
        totalVolume += current.Quantity;
        totalTasks++;

        // For backward compatibility/anomaly logic with buffers (keeping original 'netGap' logic loosely)
        // If intra-job gap > buffer (0), it's anomaly
        let netGap = 0;
        let isAnomaly = false;

        const buffer = (gapType === 'INTRA_JOB') ? config.intraJobBuffer : config.jobTransitionBuffer;
        const validGap = Math.max(0, rawGap - (buffer * 60)); // seconds
        if (validGap > (config.alertThreshold * 60)) isAnomaly = true;

        totalLostTimeMin += (rawGap / 60); // Total Gap Minutes

        enriched.push({
            ...current,
            rawGap: rawGap / 60,
            netGap: validGap / 60,
            gapType,
            isAnomaly,
            processTimeSec,
            travelTimeSec,
            interJobGapSec
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
    const distinctSkusSet = new Set<string>(); // NEW for Batchability
    const physicalLocsSet = new Set<string>(); // NEW
    data.forEach(d => {
        if (d.JobCode && d.Location) {
            distinctLocsSet.add(`${d.JobCode}::${d.Location}`);
            physicalLocsSet.add(d.Location);
        }
        if (d.SKU) distinctSkusSet.add(d.SKU);
    });
    const distinctLocations = distinctLocsSet.size;
    const locationsPerUnit = totalVolume > 0 ? distinctLocations / totalVolume : 0;
    const distinctSkus = distinctSkusSet.size; // NEW

    // UPH = Total Qty / Total Shift Hours (Occupancy)
    // Utilization = (Process Time) / (Total Shift Time) * 100
    // Process Time includes Travel (Walking + Picking)

    const totalDirectTimeHours = totalDirectTimeSec / 3600;

    // --- Helper: Calculate Full Process Stats for any dataset ---
    const calculateProcessStats = (subset: any[]): import('../types').ProcessStats => {
        if (subset.length === 0) return {
            uph: 0,
            uphPure: 0,
            uphHourlyFlow: 0,
            dynamicIntervalUPH: 0,
            tph: 0,
            utilization: 0,
            totalVolume: 0,
            totalActiveTime: 0,
            directTime: 0,
            distinctLocations: 0,
            totalTasks: 0,
            locationsPerUnit: 0,
            avgTaskDuration: 0,
            avgProcessTimeSec: 0,
            avgTravelTimeSec: 0
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

        // 3. Direct Time & GSPT Components
        let subsetDirectSec = 0;
        let sumProcessSec = 0;
        let sumTravelSec = 0;

        subset.forEach(d => {
            // If enriched fields exist, use them
            if (d.processTimeSec !== undefined && d.travelTimeSec !== undefined) {
                sumProcessSec += d.processTimeSec;
                sumTravelSec += d.travelTimeSec;
                subsetDirectSec += (d.processTimeSec + d.travelTimeSec);
            } else {
                // Fallback: raw calculation
                const dur = Math.max(0, differenceInSeconds(d.Finish, d.Start));
                subsetDirectSec += dur;
            }
        });

        const subsetDirectHours = subsetDirectSec / 3600;

        // 4. Locations
        const distinctLocsSet = new Set<string>();
        subset.forEach(d => {
            if (d.JobCode && d.Location) distinctLocsSet.add(`${d.JobCode}::${d.Location}`);
        });
        const distLocs = distinctLocsSet.size;

        // Calc Metrics
        // new: Active Wall Clock Logic (Handling Overlaps for Utilization)
        const sortedSubset = [...subset].sort((a, b) => a.Start.getTime() - b.Start.getTime());
        let activeWallClockSec = 0;
        if (sortedSubset.length > 0) {
            let currStart = sortedSubset[0].Start.getTime();
            let currEnd = sortedSubset[0].Finish.getTime();

            for (let i = 1; i < sortedSubset.length; i++) {
                const s = sortedSubset[i].Start.getTime();
                const f = sortedSubset[i].Finish.getTime();
                if (s < currEnd) {
                    // Overlap: Extend end if needed
                    if (f > currEnd) currEnd = f;
                } else {
                    // Gap: Commit current block
                    activeWallClockSec += (currEnd - currStart) / 1000;
                    currStart = s;
                    currEnd = f;
                }
            }
            // Commit last block
            activeWallClockSec += (currEnd - currStart) / 1000;
        }

        // Calc Metrics
        const vUph = subsetSpanHours > 0 ? vol / subsetSpanHours : 0;
        const vUphPure = subsetDirectHours > 0 ? vol / subsetDirectHours : 0;
        const vTph = subsetSpanHours > 0 ? taskCount / subsetSpanHours : 0;

        // Revised Utilization: Uses Active Wall Clock / Total Shift Span
        // This caps utilization at 100% (or near 100% if fully busy)
        const vUtil = subsetSpanHours > 0 ? ((activeWallClockSec / 3600) / subsetSpanHours) * 100 : 0;

        const vLocsPerUnit = vol > 0 ? distLocs / vol : 0;
        const vAvgTaskDuration = taskCount > 0 ? (subsetDirectSec / taskCount) / 60 : 0; // Minutes

        // NEW: GSPT Averages
        const vAvgProcessSec = taskCount > 0 ? sumProcessSec / taskCount : 0;
        const vAvgTravelSec = taskCount > 0 ? sumTravelSec / taskCount : 0;

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
            uph: Number(vUph.toFixed(2)),
            uphPure: Number(vUphPure.toFixed(2)),
            uphHourlyFlow: Number(vFlow.toFixed(2)),
            dynamicIntervalUPH: 0, // Fallback
            tph: Number(vTph.toFixed(2)),
            utilization: Number(vUtil.toFixed(2)),
            totalVolume: vol,
            totalActiveTime: Number(subsetSpanHours.toFixed(2)),
            directTime: Number((subsetDirectSec / 60).toFixed(2)),
            distinctLocations: distLocs,
            totalTasks: taskCount,
            locationsPerUnit: Number(vLocsPerUnit.toFixed(2)),
            avgTaskDuration: Number(vAvgTaskDuration.toFixed(2)),
            avgProcessTimeSec: Number(vAvgProcessSec.toFixed(2)),
            avgTravelTimeSec: Number(vAvgTravelSec.toFixed(2))
        };
    };

    // Calculate Global (Using Enriched)
    const globalStats = calculateProcessStats(enriched);

    // Calculate Picking (Using Enriched)
    const pickingData = enriched.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));

    // Helper: Dynamic Interval UPH (Configurable buckets)
    const calculateDynamicIntervalUPH = (subset: ShiftRecord[]): { score: number, details: import('../types').FlowDetailData } => {
        if (subset.length === 0) return { score: 0, details: { intervals: [], allUsers: [] } };

        // 1. Find Range
        // 1. Find Range (Iterative to avoid Stack Overflow)
        let minTime = Infinity;
        let maxTime = -Infinity;
        if (subset.length > 0) {
            for (let i = 0; i < subset.length; i++) {
                const s = subset[i].Start.getTime();
                const f = subset[i].Finish.getTime();
                if (s < minTime) minTime = s;
                if (f > maxTime) maxTime = f;
            }
        } else {
            minTime = 0;
            maxTime = 0;
        }

        // 2. Create Buckets
        const intervalMin = config.flowBucketInterval || 10;
        const bucketSizeMs = intervalMin * 60 * 1000;
        const buckets: Record<number, { volume: number, users: Set<string>, userVols: Record<string, number> }> = {};

        // initialize buckets
        for (let t = minTime; t <= maxTime; t += bucketSizeMs) {
            buckets[t] = { volume: 0, users: new Set(), userVols: {} };
        }

        const distinctUsers = new Set<string>();

        // 3. Populate Buckets (using Finish Time)
        subset.forEach(r => {
            distinctUsers.add(r.User);
            const recordTime = r.Finish.getTime();
            // Snap to previous block
            const bucketStart = recordTime - (recordTime % bucketSizeMs);

            if (!buckets[bucketStart]) {
                buckets[bucketStart] = { volume: 0, users: new Set(), userVols: {} };
            }
            buckets[bucketStart].volume += r.Quantity;
            buckets[bucketStart].users.add(r.User);

            if (!buckets[bucketStart].userVols[r.User]) buckets[bucketStart].userVols[r.User] = 0;
            buckets[bucketStart].userVols[r.User] += r.Quantity;
        });

        // 4. Calculate Rates & Build Details
        let totalRate = 0;
        let validIntervals = 0;
        const intervals: import('../types').IntervalData[] = [];
        const excludeEmpty = config.flowExcludeEmpty ?? true;

        // Sort timestamps keys
        const sortedTimes = Object.keys(buckets).map(Number).sort((a, b) => a - b);
        const multiplier = 60 / intervalMin;

        sortedTimes.forEach(t => {
            const b = buckets[t];
            let rate = 0;
            const activeUsers = b.users.size;

            // Logic: If excludeEmpty is TRUE, we only calculate rate if volume > 0.
            // If FALSE, we include 0 volume rows in the average (which drags it down).

            if (b.volume > 0) {
                if (activeUsers > 0) {
                    const intervalRate = b.volume / activeUsers;
                    rate = intervalRate * multiplier; // Annualize

                    totalRate += intervalRate; // Keep base rate sum
                    validIntervals++;
                }
            } else if (!excludeEmpty) {
                // Include 0 intervals if user unchecked logic
                // But wait, if volume is 0, activeUsers is 0. 0/0 = NaN.
                // So rate represents "System Efficiency". If nobody is working, efficiency is undefined or 0?
                // If we include empty buckets, we treat it as 0 efficiency.
                validIntervals++;
            }

            intervals.push({
                intervalStart: new Date(t),
                intervalEnd: new Date(t + bucketSizeMs),
                volume: b.volume,
                activeUserCount: activeUsers,
                rate: Number(rate.toFixed(2)),
                users: b.userVols
            });
        });

        // 5. Final Score Calculation based on Method
        const method = config.flowCalculationMethod || 'interval';
        let finalScore = 0;

        if (method === 'interval') {
            // Existing Logic: Average of Interval Rates
            const avgIntervalRate = validIntervals > 0 ? (totalRate / validIntervals) : 0;
            finalScore = avgIntervalRate * multiplier;
        } else {
            // New Logic: Grand Average Per User
            // 1. Pivot: User -> Date -> Hour -> Volume
            // Actually user said: "Daily UPH: Take average of each row (day)... Grand Average: Average of daily UPH"
            // Wait, logic provided:
            // "Individual User Rate: Average of each user's row (Date | Hour)"
            // "Daily Team Average: Average of all user rates for a specific date"
            // "Grand Average Per User: Average of daily team averages"

            const userDateRates: Record<string, Record<string, number>> = {}; // User -> Date -> AvgHourlyRate
            const distinctDates = new Set<string>();

            // We need to re-scan subset to build User-Date-Hour structure
            const userDateHourVol: Record<string, Record<string, Record<string, number>>> = {};

            subset.forEach(r => {
                const dateKey = format(r.Finish, 'yyyy-MM-dd');
                const hourKey = format(r.Finish, 'HH');
                distinctDates.add(dateKey);

                if (!userDateHourVol[r.User]) userDateHourVol[r.User] = {};
                if (!userDateHourVol[r.User][dateKey]) userDateHourVol[r.User][dateKey] = {};

                if (!userDateHourVol[r.User][dateKey][hourKey]) userDateHourVol[r.User][dateKey][hourKey] = 0;
                userDateHourVol[r.User][dateKey][hourKey] += r.Quantity;
            });

            // Calculate User's Daily Rate (Avg of Hours they worked)
            const dailyTeamRates: Record<string, number[]> = {}; // Date -> [UserRates]

            Object.keys(userDateHourVol).forEach(user => {
                Object.keys(userDateHourVol[user]).forEach(date => {
                    const hours = Object.values(userDateHourVol[user][date]);
                    // "Cell O3... calculated as AVERAGE(C3:M3)" (Average of non-empty hours? or all hours? Excel AVERAGE ignores empty cells usually)
                    // We will assume average of active hours.
                    const sum = hours.reduce((s, v) => s + v, 0);
                    const avg = sum / hours.length; // Average units per active hour

                    if (!dailyTeamRates[date]) dailyTeamRates[date] = [];
                    dailyTeamRates[date].push(avg);
                });
            });

            // Calculate Daily Team Avg
            const dailyAverages: number[] = [];
            Object.keys(dailyTeamRates).forEach(date => {
                const rates = dailyTeamRates[date];
                const dayAvg = rates.reduce((s, v) => s + v, 0) / rates.length;
                dailyAverages.push(dayAvg);
            });

            // Grand Average
            finalScore = dailyAverages.length > 0
                ? dailyAverages.reduce((s, v) => s + v, 0) / dailyAverages.length
                : 0;
        }

        return {
            score: Number(finalScore.toFixed(2)),
            details: {
                intervals,
                allUsers: Array.from(distinctUsers).sort()
            }
        };
    };

    const pickingFlow = calculateDynamicIntervalUPH(pickingData);
    const pickingStats = {
        ...calculateProcessStats(pickingData),
        dynamicIntervalUPH: pickingFlow.score,
        flowDetails: pickingFlow.details // NEW
    };

    const packingData = enriched.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));
    const packingFlow = calculateDynamicIntervalUPH(packingData);
    const packingStats = {
        ...calculateProcessStats(packingData),
        dynamicIntervalUPH: packingFlow.score,
        flowDetails: packingFlow.details // NEW
    };

    // Calculate Sorting (Using Enriched)
    const sortingData = enriched.filter(d => (d.TaskType || '').toLowerCase().includes('sort')); // catch 'sorting', 'sorter'
    const sortingFlow = calculateDynamicIntervalUPH(sortingData);
    const sortingStats = {
        ...calculateProcessStats(sortingData),
        dynamicIntervalUPH: sortingFlow.score,
        flowDetails: sortingFlow.details
    };

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

    // Calculate job timing metrics
    const jobTimingMetrics = calculateJobTimingMetrics(data);

    // Calculate User Performance Stats
    const userPerformance: import('../types').UserPerformanceStats[] = Object.keys(userSpans).map(user => {
        const userRecords = data.filter(d => d.User === user);
        // Recalculate span for this user (already in userSpans but let's be sure we match logic)
        const span = userSpans[user];
        const spanHours = differenceInMinutes(span.finish, span.start) / 60;

        const vol = userRecords.reduce((sum, d) => sum + d.Quantity, 0);

        // Direct time for this user
        const directSec = userRecords.reduce((sum, d) => sum + Math.max(0, differenceInSeconds(d.Finish, d.Start)), 0);
        const directHours = directSec / 3600;

        // UPH (Occupancy) = Volume / Span Hours
        const uph = spanHours > 0 ? vol / spanHours : 0;
        const utilization = spanHours > 0 ? (directHours / spanHours) * 100 : 0;

        return {
            user,
            uph: Number(uph.toFixed(2)),
            totalVolume: vol,
            totalShiftSpan: Number(spanHours.toFixed(2)),
            directTime: Number(directHours.toFixed(2)),
            utilization: Number(utilization.toFixed(2)),
            rank: 0 // set after sort
        };
    }).sort((a, b) => b.uph - a.uph);

    // Assign Ranks
    userPerformance.forEach((u, i) => u.rank = i + 1);

    return {
        records: enriched,
        stats: {
            uph: globalStats.uph,
            uphPure: globalStats.uphPure,
            uphHourlyFlow: globalStats.uphHourlyFlow,
            picking: pickingStats,
            sorting: sortingStats, // NEW
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
        advanced: calculateAdvancedMetrics(data, enriched, totalDirectTimeSec, totalShiftHours, totalVolume, distinctSkus),
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

            // P10 Baseline Logic for Process vs Travel Separation
            ...(() => {
                const allPickDurations: number[] = [];
                // Re-iterate or use what we captured? We didn't capture individual durations in an array yet, effectively.
                // Let's rely on the aggregate for avgTotal but we need the ARRAY for P10.
                // Since we are inside the map loop above, we didn't store them. 
                // We should probably do a quick filter on the 'subset' instead of re-looping if possible, OR
                // simpler: just re-iterate subset for this specific stats calculation to keep it clean.

                enriched.forEach(r => {
                    // Check if Picking Task
                    const taskType = (r.TaskType || '').toLowerCase();
                    const isPick = taskType.includes('pick') || taskType.includes('replen') || taskType.includes('put');
                    if (isPick) {
                        const dur = Math.max(0, differenceInSeconds(r.Finish, r.Start));
                        allPickDurations.push(dur);
                    }
                });

                const p10 = calculatePercentile(allPickDurations, 10);
                const avgTotal = allPickDurations.length > 0
                    ? allPickDurations.reduce((a, b) => a + b, 0) / allPickDurations.length
                    : 0;

                // Process Time = P10 (Fastest 10% represent pure work with 0 travel)
                // Travel Time = The rest (Avg Total - Process Time)
                const processTime = p10;
                const travelTime = Math.max(0, avgTotal - p10);

                return {
                    avgPickDurationSec: Number(processTime.toFixed(1)),
                    avgTravelTimeSec: Number(travelTime.toFixed(1)),
                };
            })(),

            avgPackDurationSec: packTaskCount > 0 ? Number((totalPackDuration / packTaskCount).toFixed(1)) : 0,
            avgJobTransitionMin: jobTransitionCount > 0 ? Number((totalJobTransitionTime / jobTransitionCount).toFixed(1)) : 0,

            // Job-Level Statistics
            ...(() => {
                const jobStats = calculateJobCodeStats(data);
                const totalJobs = jobStats.length;
                return {
                    totalJobs,
                    avgUnitsPerJob: totalJobs > 0
                        ? Number((jobStats.reduce((sum, job) => sum + job.totalUnits, 0) / totalJobs).toFixed(1))
                        : 0,
                    avgSkusPerJob: totalJobs > 0
                        ? Number((jobStats.reduce((sum, job) => sum + job.totalSkus, 0) / totalJobs).toFixed(1))
                        : 0,
                    avgLocationsPerJob: totalJobs > 0
                        ? Number((jobStats.reduce((sum, job) => sum + job.totalLocations, 0) / totalJobs).toFixed(1))
                        : 0,
                    avgOrdersPerJob: totalJobs > 0
                        ? Number((jobStats.reduce((sum, job) => sum + job.totalOrders, 0) / totalJobs).toFixed(1))
                        : 0,
                    avgTasksPerJob: totalJobs > 0
                        ? Number((totalTasks / totalJobs).toFixed(1))
                        : 0,
                    jobCodeStats: jobStats
                };
            })(),

            jobTypeStats: calculateJobTypeStats(data),
            taskTypeStats: calculateTaskTypeStats(data),
            waveStats: calculateWaveStats(data) // NEW
        },
        telemetry,
        roleDiagnostics: {
            pickers: Array.from(pickerDebug.entries()).map(([user, reason]) => ({ user, reason })).sort((a, b) => a.user.localeCompare(b.user)),
            packers: Array.from(packerDebug.entries()).map(([user, reason]) => ({ user, reason })).sort((a, b) => a.user.localeCompare(b.user))
        },
        jobTimingMetrics,
        userPerformance
    };
}

// --- Utility Functions ---

/**
 * Calculate percentile from an array of numbers
 */
function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate job timing metrics from shift data
 * Returns inter-job gap, cycle time, and duration metrics
 */
function calculateJobTimingMetrics(data: ShiftRecord[]): JobTimingMetrics {
    // Group tasks by JobCode to identify job boundaries
    const jobMap = new Map<string, {
        startTime: Date;
        endTime: Date;
        user: string;
    }>();

    data.forEach(d => {
        if (!jobMap.has(d.JobCode)) {
            jobMap.set(d.JobCode, {
                startTime: d.Start,
                endTime: d.Finish,
                user: d.User
            });
        } else {
            const job = jobMap.get(d.JobCode)!;
            if (d.Start < job.startTime) job.startTime = d.Start;
            if (d.Finish > job.endTime) job.endTime = d.Finish;
        }
    });

    // Convert map values to array
    const allJobs = Array.from(jobMap.values());

    // Group jobs by user to ensure we only calculate gaps for the same person
    const jobsByUser = new Map<string, typeof allJobs>();
    allJobs.forEach(j => {
        if (!jobsByUser.has(j.user)) jobsByUser.set(j.user, []);
        jobsByUser.get(j.user)!.push(j);
    });

    const interJobGaps: number[] = [];
    const cycleTimes: number[] = [];
    const durations: number[] = [];
    let outliersExcluded = 0;
    const MAX_REASONABLE_GAP_MIN = 8 * 60; // 8 hours

    // Iterate through each user's timeline independently
    jobsByUser.forEach(userJobs => {
        // Sort user's jobs by start time
        userJobs.sort((a, b) => compareAsc(a.startTime, b.startTime));

        for (let i = 0; i < userJobs.length; i++) {
            const currentJob = userJobs[i];

            // Job duration (always calculate)
            const durationMin = differenceInMinutes(currentJob.endTime, currentJob.startTime);
            durations.push(Math.max(0, durationMin));

            if (i > 0) {
                const prevJob = userJobs[i - 1];

                // Inter-job gap (downtime between jobs)
                const gapMin = differenceInMinutes(currentJob.startTime, prevJob.endTime);

                // Cycle time (time between job starts)
                const cycleMin = differenceInMinutes(currentJob.startTime, prevJob.startTime);

                if (gapMin >= 0 && gapMin < MAX_REASONABLE_GAP_MIN) {
                    interJobGaps.push(gapMin);
                } else if (gapMin >= MAX_REASONABLE_GAP_MIN) {
                    outliersExcluded++;
                }

                if (cycleMin > 0 && cycleMin < MAX_REASONABLE_GAP_MIN) {
                    cycleTimes.push(cycleMin);
                } else if (cycleMin >= MAX_REASONABLE_GAP_MIN) {
                    outliersExcluded++;
                }
            }
        }
    });

    // Calculate statistics
    const calcStats = (values: number[]) => {
        if (values.length === 0) return { avg: 0, median: 0, p90: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        return {
            avg: Number((sum / values.length).toFixed(1)),
            median: Number(calculatePercentile(values, 50).toFixed(1)),
            p90: Number(calculatePercentile(values, 90).toFixed(1))
        };
    };

    const gapStats = calcStats(interJobGaps);
    const cycleStats = calcStats(cycleTimes);
    const durationStats = calcStats(durations);

    return {
        avgInterJobGapMin: gapStats.avg,
        medianInterJobGapMin: gapStats.median,
        p90InterJobGapMin: gapStats.p90,
        avgCycleTimeMin: cycleStats.avg,
        medianCycleTimeMin: cycleStats.median,
        p90CycleTimeMin: cycleStats.p90,
        avgJobDurationMin: durationStats.avg,
        medianJobDurationMin: durationStats.median,
        p90JobDurationMin: durationStats.p90,
        totalJobsAnalyzed: allJobs.length,
        outliersExcluded
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

function calculateAdvancedMetrics(
    data: ShiftRecord[],
    enriched: EnrichedShiftRecord[],
    totalDirectTimeSec: number,
    totalShiftHours: number,
    totalVolume: number,
    distinctSkus: number
): import('../types').AdvancedMetrics {
    // 1. Transition Friction (The "Meat" vs "Sandwich")
    // Formula: Sum(Task Durations within Job) / (Job Finish - Job Start)
    // Target: Higher (closer to 1.0) is better.
    const jobStats = new Map<string, { start: Date; finish: Date; activeSec: number }>();

    // We can reuse EnrichedShiftRecord to get task durations easier?
    // Enriched has 'Finish' and 'Start'. 
    // We need to group by JobCode.
    enriched.forEach(r => {
        if (!jobStats.has(r.JobCode)) {
            jobStats.set(r.JobCode, { start: r.Start, finish: r.Finish, activeSec: 0 });
        }
        const j = jobStats.get(r.JobCode)!;
        if (r.Start < j.start) j.start = r.Start;
        if (r.Finish > j.finish) j.finish = r.Finish;

        const dur = Math.max(0, differenceInSeconds(r.Finish, r.Start));
        j.activeSec += dur;
    });

    let sumFriction = 0;
    let frictionCount = 0;

    jobStats.forEach(j => {
        const jobDurationSec = differenceInSeconds(j.finish, j.start);
        if (jobDurationSec > 0) {
            const ratio = j.activeSec / jobDurationSec;
            // Cap at 1.0 just in case data is weird, though mathematically it shouldn't be > 1 unless overlapping tasks
            sumFriction += Math.min(1.0, ratio);
            frictionCount++;
        }
    });

    const transitionFriction = frictionCount > 0 ? Number((sumFriction / frictionCount).toFixed(2)) : 0;


    // 2. Pick-to-Pack Sync
    // Logic: Min(Pack Start in Wave) - Max(Pick Finish in Wave)
    // Target: Lower (negative means overlap/good flow)
    const waveStats = new Map<string, { maxPickFinish: Date | null; minPackStart: Date | null }>();

    data.forEach(d => {
        if (!d.WaveCode) return;

        if (!waveStats.has(d.WaveCode)) {
            waveStats.set(d.WaveCode, { maxPickFinish: null, minPackStart: null });
        }
        const w = waveStats.get(d.WaveCode)!;
        const type = (d.TaskType || '').toLowerCase();

        if (type.includes('picking')) {
            if (!w.maxPickFinish || d.Finish > w.maxPickFinish) w.maxPickFinish = d.Finish;
        } else if (type.includes('packing')) {
            if (!w.minPackStart || d.Start < w.minPackStart) w.minPackStart = d.Start;
        }
    });

    let sumSyncMin = 0;
    let syncCount = 0;

    waveStats.forEach(w => {
        if (w.maxPickFinish && w.minPackStart) {
            const diffMin = differenceInMinutes(w.minPackStart, w.maxPickFinish);
            sumSyncMin += diffMin;
            syncCount++;
        }
    });

    const pickToPackSyncMin = syncCount > 0 ? Number((sumSyncMin / syncCount).toFixed(2)) : 0;


    // 3. Active Scan Ratio
    // Logic: Total Task Duration / Total Shift Span
    // totalDirectTimeSec is sum of all task durations.
    // totalShiftHours is sum of all user spans.
    const activeScanRatio = totalShiftHours > 0
        ? Number(((totalDirectTimeSec / 3600) / totalShiftHours).toFixed(2))
        : 0;


    // 4. SKU Batchability
    // Logic: Total Units / Count of Distinct SKUs
    const skuBatchability = distinctSkus > 0
        ? Number((totalVolume / distinctSkus).toFixed(2))
        : 0;

    return {
        transitionFriction,
        pickToPackSyncMin,
        activeScanRatio,
        skuBatchability
    };
}

// Export return type
export type ShiftAnalysis = ReturnType<typeof analyzeShift>;
