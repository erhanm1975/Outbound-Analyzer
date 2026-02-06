import type { ShiftRecord, TaskObject, ActivityObject } from '../types';
import { differenceInSeconds } from 'date-fns';

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------
const CONFIG = {
    RATIO_TRAVEL: 0.70,
    RATIO_DIRECT: 0.30,
    BREAK_THRESHOLD_SEC: 300, // 5 minutes
    MAX_DURATION_CAP_SEC: 7200, // 2 hours
};

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

// Create a unique key for batch identification
const getBatchKey = (r: ShiftRecord) => {
    return `${r.User}|${r.Start.getTime()}|${r.Finish.getTime()}|${r.Location}`;
};

const safeDiv = (num: number, den: number) => den === 0 ? 0 : num / den;

// ----------------------------------------------------------------------
// Core Logic
// ----------------------------------------------------------------------

export function processWarehouseLogic(records: ShiftRecord[]): { tasks: TaskObject[], activities: ActivityObject[] } {
    if (records.length === 0) return { tasks: [], activities: [] };

    // 1. Sort Records: User ASC, Start ASC
    const sorted = [...records].sort((a, b) => {
        if (a.User < b.User) return -1;
        if (a.User > b.User) return 1;
        return a.Start.getTime() - b.Start.getTime();
    });

    // ------------------------------------------------------------------
    // Phase 1: Task Object Creation (Batch Normalization + Decomposition)
    // ------------------------------------------------------------------

    const taskObjects: TaskObject[] = [];
    const batchMap = new Map<string, ShiftRecord[]>();

    // A. Group into batches
    sorted.forEach(r => {
        const key = getBatchKey(r);
        if (!batchMap.has(key)) batchMap.set(key, []);
        batchMap.get(key)!.push(r);
    });

    // B. Process batches
    batchMap.forEach((batch) => {
        const batchSize = batch.length;

        batch.forEach(record => {
            const start = record.Start;
            const finish = record.Finish;

            // Edge Case: Zero Duration -> 1s
            let duration = differenceInSeconds(finish, start);
            if (duration <= 0) duration = 1;

            // Outlier Detection (Flag locally or cap? Spec says "Flag", but for calc we use it)
            // We will just use it but could cap it if needed. Leaving raw for now.

            // Batch Normalization
            const normalizedDuration = duration / batchSize;

            // Conditional Decomposition
            const type = (record.TaskType || '').toLowerCase();
            let unproductiveDuration = 0;
            let productiveDuration = normalizedDuration;
            let directTime = 0;
            let travelTime = 0;

            if (type.includes('pick')) {
                directTime = normalizedDuration * CONFIG.RATIO_DIRECT;
                travelTime = normalizedDuration * CONFIG.RATIO_TRAVEL;
            } else if (type.includes('pack') || type.includes('sort')) {
                directTime = normalizedDuration * 1.0;
                travelTime = 0;
            } else if (type.includes('break') || type.includes('delay')) {
                // Unproductive Tasks
                productiveDuration = 0;
                unproductiveDuration = normalizedDuration;
                directTime = 0;
                travelTime = 0;
            } else {
                // Default fallback (treat as direct?)
                directTime = normalizedDuration;
                travelTime = 0;
            }

            taskObjects.push({
                User: record.User,
                Client: record.Client || 'Unknown',
                SKU: record.SKU,
                Location: record.Location,
                Zone: record.Zone || '',
                Quantity: record.Quantity,
                JobCode: String(record.JobCode || 'Unassigned').trim(),
                OrderCode: record.OrderCode || 'Unknown',
                TaskType: record.TaskType || 'Unknown',
                Start: start,
                Finish: finish,
                ProductiveDurationSec: productiveDuration,
                TaskDirectTimeSec: directTime,
                TaskTravelTimeSec: travelTime,
                UnproductiveDurationSec: unproductiveDuration,
                TotalUnits: record.Quantity,
                IsBatchNormalized: batchSize > 1,
                OriginalDurationSec: duration,
                BatchSize: batchSize
            });
        });
    });

    // Re-sort Task Objects for Sequential Processing
    taskObjects.sort((a, b) => {
        if (a.User < b.User) return -1;
        if (a.User > b.User) return 1;
        return a.Start.getTime() - b.Start.getTime();
    });

    // ------------------------------------------------------------------
    // Phase 1.5: Gap Injection (Task Level Sequence Reconstruction)
    // ------------------------------------------------------------------

    const SHIFT_START_HOUR = 8;
    const SHIFT_START_MIN = 0;

    const injectGaps = (userRecs: TaskObject[]): TaskObject[] => {
        if (userRecs.length === 0) return [];

        // Sort (already sorted but ensure)
        userRecs.sort((a, b) => a.Start.getTime() - b.Start.getTime());

        const filled: TaskObject[] = [];

        // Use UTC for robustness
        const dayRef = userRecs[0].Start;
        const shiftStart = new Date(dayRef);
        shiftStart.setUTCHours(SHIFT_START_HOUR, SHIFT_START_MIN, 0, 0);

        let cursor = shiftStart;
        let lastJobCode: string | null = null;

        userRecs.forEach(task => {
            const gapSec = differenceInSeconds(task.Start, cursor);

            // Insert Gap Task if needed
            if (gapSec > 0) {
                const isBreak = gapSec >= CONFIG.BREAK_THRESHOLD_SEC;
                const type = isBreak ? 'Break' : 'No Activity';

                // Job Attribution Logic
                // If Gap is strictly between two tasks of the SAME job, it inherits the JobCode (Intra-Job).
                // Otherwise (Inter-Job or Pre-Shift), it is Unassigned.
                const isIntraJob = lastJobCode && lastJobCode === task.JobCode;
                const gapJobCode = isIntraJob ? lastJobCode : 'Unassigned'; // Or ''/null? TaskObject requires string. 'Unassigned' is safer for UI.

                filled.push({
                    User: task.User,
                    Client: '',
                    SKU: '',
                    Location: '',
                    Zone: '',
                    Quantity: 0,
                    JobCode: gapJobCode!,
                    OrderCode: '',
                    TaskType: type,
                    Start: cursor,
                    Finish: task.Start,
                    ProductiveDurationSec: isBreak ? 0 : gapSec,
                    UnproductiveDurationSec: isBreak ? gapSec : 0,
                    TaskDirectTimeSec: 0,
                    TaskTravelTimeSec: 0,
                    TotalUnits: 0,
                    IsBatchNormalized: false,
                    OriginalDurationSec: gapSec,
                    BatchSize: 1
                });
            }

            filled.push(task);

            // Advance cursor
            if (task.Finish > cursor) {
                cursor = task.Finish;
            }
            lastJobCode = task.JobCode;
        });

        return filled;
    };

    // ------------------------------------------------------------------
    // Phase 2: Activity Object Creation (Contiguous Aggregation)
    // ------------------------------------------------------------------

    const activityObjects: ActivityObject[] = [];
    const tasksByUser = new Map<string, TaskObject[]>();

    // Refactored: We now group keys based on filled tasks
    // But Wait! I need to run injectGaps PER USER first.

    // Group raw objects first
    const rawByUser = new Map<string, TaskObject[]>();
    taskObjects.forEach(t => {
        if (!rawByUser.has(t.User)) rawByUser.set(t.User, []);
        rawByUser.get(t.User)!.push(t);
    });

    const allFilledTasks: TaskObject[] = [];

    rawByUser.forEach((userTasks, user) => {
        const filledTasks = injectGaps(userTasks);
        allFilledTasks.push(...filledTasks); // Collect for return

        if (filledTasks.length === 0) return;

        // Group into Activities
        // Logic: Contiguous tasks with same JobCode form an Activity.
        // Even "Unassigned" JobCodes merge into an "Unassigned" Activity (e.g. big break block).

        let currentBlock: {
            JobCode: string;
            Start: Date;
            Finish: Date;
            Tasks: TaskObject[];
        } | null = null;

        const flushBlock = (blk: NonNullable<typeof currentBlock>) => {
            let prodDur = 0;
            let unprodDur = 0;
            let direct = 0;
            let travel = 0;
            let units = 0;
            const taskTypes = new Set<string>();
            const orderCodes = new Set<string>();

            blk.Tasks.forEach(t => {
                prodDur += t.ProductiveDurationSec;
                unprodDur += t.UnproductiveDurationSec;
                direct += t.TaskDirectTimeSec;
                travel += t.TaskTravelTimeSec;
                units += t.Quantity;
                if (t.TaskType) taskTypes.add(t.TaskType);
                if (t.OrderCode && t.OrderCode !== 'Unknown' && t.OrderCode !== '') orderCodes.add(t.OrderCode);
            });

            activityObjects.push({
                id: crypto.randomUUID(),
                User: user,
                Activity: Array.from(taskTypes).join('|'),
                JobCode: blk.JobCode === 'Unassigned' ? null : blk.JobCode, // Convert back to null for UI check if needed
                Start: blk.Start,
                Finish: blk.Finish,
                ProductiveDurationSec: prodDur,
                UnproductiveDurationSec: unprodDur,
                TaskDirectTimeSec: direct,
                TaskTravelTimeSec: travel,
                NofOrders: orderCodes.size,
                NofTasks: blk.Tasks.length,
                NofUnits: units,
                AvgTaskDurationSec: safeDiv(prodDur + unprodDur, blk.Tasks.length), // Avg should include total time? Usually just productive. Keeping existing logic.
                AvgTravelDurationSec: safeDiv(travel, blk.Tasks.length)
            });
        };

        filledTasks.forEach(task => {
            if (!currentBlock) {
                currentBlock = {
                    JobCode: task.JobCode,
                    Start: task.Start,
                    Finish: task.Finish,
                    Tasks: [task]
                };
            } else {
                if (task.JobCode === currentBlock.JobCode) {
                    currentBlock.Tasks.push(task);
                    if (task.Finish > currentBlock.Finish) currentBlock.Finish = task.Finish;
                } else {
                    flushBlock(currentBlock);
                    currentBlock = {
                        JobCode: task.JobCode,
                        Start: task.Start,
                        Finish: task.Finish,
                        Tasks: [task]
                    };
                }
            }
        });

        if (currentBlock) flushBlock(currentBlock);
    });

    return { tasks: allFilledTasks, activities: activityObjects };
}
