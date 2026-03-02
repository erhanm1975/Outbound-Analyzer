import type { ShiftRecord, TaskObject, ActivityObject, EngineeredStandardsConfig } from '../types';
import { differenceInSeconds } from 'date-fns';
import { calculateTaskForensics } from './calculation-service';
import { TIME } from '../config/constants';

export interface Config {
    smoothingTolerance?: number; // Configurable tolerance
    breakThreshold?: number;
    travelRatio?: number;
    engineeredStandards?: EngineeredStandardsConfig;
    jobTypeMapping?: Record<string, string>;
}

const getBatchKey = (r: ShiftRecord) => {
    return `${r.User}|${r.Start.getTime()}|${r.Finish.getTime()}|${r.Location}|${r.JobCode || 'Unassigned'}`;
};

export function processWarehouseLogic(records: ShiftRecord[], config: Config = {}): { tasks: TaskObject[], activities: ActivityObject[] } {
    let taskObjects: TaskObject[] = [];

    // 1. Convert to Base TaskObjects & Determine Job Type
    records.sort((a, b) => a.Start.getTime() - b.Start.getTime());

    const batchGroups = new Map<string, ShiftRecord[]>();
    records.forEach(r => {
        const key = getBatchKey(r);
        if (!batchGroups.has(key)) batchGroups.set(key, []);
        batchGroups.get(key)!.push(r);
    });

    batchGroups.forEach((batch, key) => {
        const batchSize = batch.length;

        batch.forEach(record => {
            const rawDur = differenceInSeconds(record.Finish, record.Start);
            const duration = Math.max(0, rawDur);
            const normalizedDuration = duration / batchSize;

            const rawType = (record.TaskType || '').toLowerCase();
            let isProd = false;
            if (rawType.includes('pick') || rawType.includes('sort') || rawType.includes('pack') || rawType.includes('put') || rawType.includes('stow') || rawType.includes('load')) {
                isProd = true;
            }

            const rawJobType = record.JobType || 'Unknown';
            const mappedJobType = config.jobTypeMapping?.[rawJobType] || rawJobType;

            taskObjects.push({
                User: record.User,
                Client: record.Client || 'Unknown',
                WaveCode: record.WaveCode || 'N/A',
                JobCode: record.JobCode || 'Unassigned',
                JobType: mappedJobType,
                OrderCode: record.OrderCode || 'Unknown',
                TaskType: record.TaskType || 'Unknown',
                SKU: record.SKU || '',
                Quantity: Number(record.Quantity) || 0, // Fallback to 0!
                Location: record.Location || '',
                Zone: record.Zone || '',
                Start: record.Start,
                Finish: record.Finish,
                ProductiveDurationSec: isProd ? normalizedDuration : 0,
                UnproductiveDurationSec: isProd ? 0 : normalizedDuration,
                TaskDirectTimeSec: 0,
                TaskTravelTimeSec: 0,
                TotalUnits: Number(record.Quantity) || 0, // Fallback to 0!
                IsBatchNormalized: batchSize > 1,
                OriginalDurationSec: duration,
                BatchSize: batchSize,
                filename: record.filename
            });
        });
    });

    taskObjects.sort((a, b) => {
        if (a.User < b.User) return -1;
        if (a.User > b.User) return 1;
        const startDiff = a.Start.getTime() - b.Start.getTime();
        if (startDiff !== 0) return startDiff;
        return a.Finish.getTime() - b.Finish.getTime();
    });

    const smoothedTasks: TaskObject[] = [];
    if (taskObjects.length > 0) {
        let cluster: TaskObject[] = [taskObjects[0]];

        for (let i = 1; i < taskObjects.length; i++) {
            const prev = cluster[cluster.length - 1];
            const curr = taskObjects[i];

            const timeDiffSeq = Math.abs(curr.Start.getTime() - prev.Finish.getTime());
            const timeDiffConc = Math.abs(curr.Start.getTime() - prev.Start.getTime());

            const smoothingToleranceMs = (config.smoothingTolerance || 2) * 1000;

            const isSameBatchSequence =
                curr.User === prev.User &&
                curr.JobCode.trim() === prev.JobCode.trim() &&
                curr.Location.trim() === prev.Location.trim() &&
                curr.SKU.trim() === prev.SKU.trim() &&
                (timeDiffSeq < smoothingToleranceMs || timeDiffConc < smoothingToleranceMs);

            if (isSameBatchSequence) {
                cluster.push(curr);
            } else {
                if (cluster.length > 1) {
                    const totalProd = cluster.reduce((sum, t) => sum + t.ProductiveDurationSec, 0);
                    const totalUnprod = cluster.reduce((sum, t) => sum + t.UnproductiveDurationSec, 0);
                    const totalOriginal = cluster.reduce((sum, t) => sum + t.OriginalDurationSec, 0);

                    const avgProd = totalProd / cluster.length;
                    const avgUnprod = totalUnprod / cluster.length;
                    const avgOriginal = totalOriginal / cluster.length;

                    cluster.forEach(t => {
                        t.ProductiveDurationSec = avgProd;
                        t.UnproductiveDurationSec = avgUnprod;
                        t.OriginalDurationSec = avgOriginal;
                        smoothedTasks.push(t);
                    });
                } else {
                    smoothedTasks.push(cluster[0]);
                }
                cluster = [curr];
            }
        }
        if (cluster.length > 1) {
            const totalProd = cluster.reduce((sum, t) => sum + t.ProductiveDurationSec, 0);
            const totalUnprod = cluster.reduce((sum, t) => sum + t.UnproductiveDurationSec, 0);
            const totalOriginal = cluster.reduce((sum, t) => sum + t.OriginalDurationSec, 0);

            const avgProd = totalProd / cluster.length;
            const avgUnprod = totalUnprod / cluster.length;
            const avgOriginal = totalOriginal / cluster.length;

            cluster.forEach(t => {
                t.ProductiveDurationSec = avgProd;
                t.UnproductiveDurationSec = avgUnprod;
                t.OriginalDurationSec = avgOriginal;
                smoothedTasks.push(t);
            });
        } else if (cluster.length === 1) {
            smoothedTasks.push(cluster[0]);
        }
    }

    const tasksToProcess = smoothedTasks.length > 0 ? smoothedTasks : taskObjects;

    let currentJobCode = '';
    let currentActivity = '';

    // Track flags
    const visitedLocs = new Set<string>();
    const visitedLocSkus = new Set<string>();
    const visitedOrders = new Set<string>();
    const visitedPackingOrders = new Set<string>();

    // Removed legacy downstream heuristic hack

    tasksToProcess.forEach((task, index) => {
        const isFirst = index === 0;

        const isFirstTaskInJob = task.JobCode !== currentJobCode;
        if (isFirstTaskInJob) {
            currentJobCode = task.JobCode || '';
            visitedLocs.clear();
            visitedLocSkus.clear();
            // Orders are NOT cleared per job because an individual order can span jobs potentially, 
            // but for safety we'll track them uniquely for the wave runtime unless we reset them here.
            // Actuality: JobCode IS OrderCode in OBPP.
            visitedOrders.clear();
            visitedPackingOrders.clear();
        }

        const isNewVisit = !visitedLocs.has(task.Location);
        if (task.Location) visitedLocs.add(task.Location);

        const isNewSku = !visitedLocSkus.has(`${task.Location}|${task.SKU}`);
        if (task.Location && task.SKU) visitedLocSkus.add(`${task.Location}|${task.SKU}`);

        const actName = task.TaskType || '';
        const isFirstInActivity = actName !== currentActivity;
        if (isFirstInActivity) currentActivity = actName;

        const isFirstTaskInOrder = !visitedOrders.has(task.OrderCode || '');
        if (task.OrderCode) visitedOrders.add(task.OrderCode);

        const isFirstPackingTaskInOrder = actName.toLowerCase().includes('pack') && !visitedPackingOrders.has(task.OrderCode || '');
        if (actName.toLowerCase().includes('pack') && task.OrderCode) visitedPackingOrders.add(task.OrderCode);

        // TODO: Line based... just say false for now except if we want it? No, it's just 1 line per task row.
        const isNewLine = true;

        if (config.engineeredStandards) {
            calculateTaskForensics(
                task,
                {
                    isFirstTaskInJobFlow: isFirstTaskInJob,
                    isFirstInJob: isFirstTaskInJob,
                    isNewVisit,
                    isNewSku,
                    isFirstInOrder: isFirstTaskInOrder,
                    isFirstPackingTaskInOrder
                },
                config.engineeredStandards
            );
        } else {
            task.ProductiveDurationStandardSec = 0;
            task.ProductiveDurationTargetSec = 0;
            task.StandardPickingInitSec = 0;
            task.StandardPickingProcessSec = 0;
            task.StandardPickingTravelSec = 0;
            task.StandardSortingInitSec = 0;
            task.StandardSortingProcessSec = 0;
            task.StandardPackingInitSec = 0;
            task.StandardPackingProcessSec = 0;
        }

        // Legacy decomposition for unprod
        const rawType = (task.TaskType || '').toLowerCase();
        if (rawType.includes('pick')) {
            task.TaskDirectTimeSec = task.ProductiveDurationSec * (1 - (config.travelRatio || 0.70));
            task.TaskTravelTimeSec = task.ProductiveDurationSec * (config.travelRatio || 0.70);
        } else if (rawType.includes('sort') || rawType.includes('pack')) {
            task.TaskDirectTimeSec = task.ProductiveDurationSec;
            task.TaskTravelTimeSec = 0;
        } else {
            task.TaskDirectTimeSec = task.ProductiveDurationSec;
            task.TaskTravelTimeSec = 0;
        }
    });

    const injectGaps = (userTasks: TaskObject[]): TaskObject[] => {
        const breakThresholdMs = (config.breakThreshold || 300) * 1000;
        const filled: TaskObject[] = [];
        let cursor = userTasks.length > 0 ? userTasks[0].Start : new Date();
        let lastJobCode = 'Unassigned';

        userTasks.forEach(task => {
            const gapMs = task.Start.getTime() - cursor.getTime();
            if (gapMs > breakThresholdMs && gapMs < TIME.TWELVE_HOURS_MS) {
                // If the break is between two tasks in the SAME job, inherit that JobCode
                // so the break stays grouped inside the job's ActivityObject.
                // If it's between different jobs, use 'Unassigned' for a standalone break row.
                const isIntraJob = task.JobCode === lastJobCode && lastJobCode !== 'Unassigned';
                filled.push({
                    User: task.User,
                    Client: task.Client,
                    WaveCode: 'N/A',
                    JobCode: isIntraJob ? lastJobCode : 'Break',
                    JobType: 'Break',
                    OrderCode: 'Unknown',
                    TaskType: 'Implicit Break/Delay',
                    SKU: '',
                    Quantity: 0,
                    Location: '',
                    Zone: '',
                    Start: new Date(cursor),
                    Finish: new Date(task.Start),
                    ProductiveDurationSec: 0,
                    UnproductiveDurationSec: gapMs / 1000,
                    ProductiveDurationStandardSec: 0,
                    ProductiveDurationTargetSec: 0,
                    TaskDirectTimeSec: 0,
                    TaskTravelTimeSec: 0,
                    TotalUnits: 0,
                    IsBatchNormalized: false,
                    OriginalDurationSec: gapMs / 1000,
                    BatchSize: 1,
                    filename: task.filename
                });
            }
            filled.push(task);
            if (task.Finish > cursor) {
                cursor = task.Finish;
            }
            lastJobCode = task.JobCode || 'Unassigned';
        });

        return filled;
    };

    const activityObjectsArr: ActivityObject[] = [];
    const rawByUser = new Map<string, TaskObject[]>();

    tasksToProcess.forEach(t => {
        if (!rawByUser.has(t.User)) rawByUser.set(t.User, []);
        rawByUser.get(t.User)!.push(t);
    });

    const allFilledTasks: TaskObject[] = [];

    rawByUser.forEach((userTasks, user) => {
        const filledTasks = injectGaps(userTasks);
        allFilledTasks.push(...filledTasks);

        if (filledTasks.length === 0) return;

        let currentBlock: any = null;

        const flushBlock = (blk: any) => {
            let prodDur = 0, unprodDur = 0, direct = 0, travel = 0, units = 0;
            let prodStd = 0, prodTgt = 0;
            let pickInit = 0, pickProc = 0, pickTrav = 0;
            let sortInit = 0, sortProc = 0;
            let packInit = 0, packProc = 0;

            // Targets
            let tPickInit = 0, tPickProc = 0, tPickTrav = 0;
            let tSortInit = 0, tSortProc = 0;
            let tPackInit = 0, tPackProc = 0;

            const taskTypes = new Set<string>();
            const orderCodes = new Set<string>();

            blk.Tasks.forEach((t: any) => {
                prodDur += t.ProductiveDurationSec || 0;
                unprodDur += t.UnproductiveDurationSec || 0;
                direct += t.TaskDirectTimeSec || 0;
                travel += t.TaskTravelTimeSec || 0;
                units += t.Quantity || 0;

                // Aggregate Standards
                prodStd += t.ProductiveDurationStandardSec || 0;
                prodTgt += t.ProductiveDurationTargetSec || 0;
                pickInit += t.StandardPickingInitSec || 0;
                pickProc += t.StandardPickingProcessSec || 0;
                pickTrav += t.StandardPickingTravelSec || 0;
                sortInit += t.StandardSortingInitSec || 0;
                sortProc += t.StandardSortingProcessSec || 0;
                packInit += t.StandardPackingInitSec || 0;
                packProc += t.StandardPackingProcessSec || 0;

                tPickInit += t.TargetPickingInitSec || 0;
                tPickProc += t.TargetPickingProcessSec || 0;
                tPickTrav += t.TargetPickingTravelSec || 0;
                tSortInit += t.TargetSortingInitSec || 0;
                tSortProc += t.TargetSortingProcessSec || 0;
                tPackInit += t.TargetPackingInitSec || 0;
                tPackProc += t.TargetPackingProcessSec || 0;

                if (t.TaskType) taskTypes.add(t.TaskType);
                if (t.OrderCode && t.OrderCode !== 'Unknown' && t.OrderCode !== '') orderCodes.add(t.OrderCode);
            });

            activityObjectsArr.push({
                id: crypto.randomUUID(),
                User: user,
                Activity: Array.from(taskTypes).join('|'),
                JobCode: blk.JobCode === 'Unassigned' ? null : blk.JobCode,
                JobType: blk.JobType || 'Unknown',
                Start: blk.Start,
                Finish: blk.Finish,
                ProductiveDurationSec: prodDur,
                UnproductiveDurationSec: unprodDur,
                TaskDirectTimeSec: direct,
                TaskTravelTimeSec: travel,
                NofOrders: orderCodes.size,
                NofTasks: blk.Tasks.filter((t: any) => t.JobType !== 'Break' && t.TaskType !== 'Implicit Break/Delay').length,
                NofUnits: units,
                AvgTaskDurationSec: (prodDur + unprodDur) / blk.Tasks.length,
                AvgTravelDurationSec: travel / blk.Tasks.length,
                ProductiveDurationStandardSec: prodStd,
                ProductiveDurationTargetSec: prodTgt,
                PickingInit: pickInit,
                PickingProcess: pickProc,
                PickingTravel: pickTrav,
                SortingInit: sortInit,
                SortingProcess: sortProc,
                PackingInit: packInit,
                PackingProcess: packProc,
                TargetPickingInit: tPickInit,
                TargetPickingProcess: tPickProc,
                TargetPickingTravel: tPickTrav,
                TargetSortingInit: tSortInit,
                TargetSortingProcess: tSortProc,
                TargetPackingInit: tPackInit,
                TargetPackingProcess: tPackProc
            });
        };

        filledTasks.forEach(task => {
            if (!currentBlock) {
                currentBlock = { JobCode: task.JobCode, JobType: task.JobType, Start: task.Start, Finish: task.Finish, Tasks: [task] };
            } else {
                // To be in the same block, they must share the identical JobCode.
                // However, an injected 'Break' JobType should NEVER mix with a productive JobType, even if both have JobCode 'Unassigned' or 'Break'.
                let isSameBlock = task.JobCode === currentBlock.JobCode;

                if ((task.JobCode === 'Unassigned' || task.JobCode === 'Break') && task.JobType !== currentBlock.Tasks[0].JobType) {
                    isSameBlock = false;
                }

                if (isSameBlock) {
                    currentBlock.Tasks.push(task);
                    if (task.Finish > currentBlock.Finish) currentBlock.Finish = task.Finish;
                } else {
                    flushBlock(currentBlock);
                    currentBlock = { JobCode: task.JobCode, JobType: task.JobType, Start: task.Start, Finish: task.Finish, Tasks: [task] };
                }
            }
        });

        if (currentBlock) flushBlock(currentBlock);
    });

    return { tasks: allFilledTasks, activities: activityObjectsArr };
}
