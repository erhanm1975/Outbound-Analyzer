import type { ShiftRecord, TaskObject, ActivityObject, EngineeredStandardsConfig } from '../types';
import { differenceInSeconds } from 'date-fns';

export interface Config {
    smoothingTolerance?: number; // Configurable tolerance
    breakThreshold?: number;
    travelRatio?: number;
    engineeredStandards?: EngineeredStandardsConfig;
    jobTypeMapping?: Record<string, string>;
}

const getBatchKey = (r: ShiftRecord) => {
    return `${r.User}|${r.Start.getTime()}|${r.Finish.getTime()}|${r.Location}`;
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
        return a.Start.getTime() - b.Start.getTime();
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

                    const avgProd = totalProd / cluster.length;
                    const avgUnprod = totalUnprod / cluster.length;

                    cluster.forEach(t => {
                        t.ProductiveDurationSec = avgProd;
                        t.UnproductiveDurationSec = avgUnprod;
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

            const avgProd = totalProd / cluster.length;
            const avgUnprod = totalUnprod / cluster.length;

            cluster.forEach(t => {
                t.ProductiveDurationSec = avgProd;
                t.UnproductiveDurationSec = avgUnprod;
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

    const hasExplicitPutwallDownstream = tasksToProcess.some(t => {
        const type = (t.TaskType || '').toLowerCase();
        const jt = (t.JobType || '').trim();
        return jt === 'PUTW' && (type.includes('sort') || type.includes('pack'));
    });

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

        const b = calculateBenchmarks(
            task, isFirst, isNewVisit, isFirstInActivity, isFirstTaskInJob, isFirstTaskInOrder,
            isNewLine, isNewSku, isFirstPackingTaskInOrder, hasExplicitPutwallDownstream, config
        );

        task.ProductiveDurationStandardSec = b.prodStd;
        task.ProductiveDurationTargetSec = b.prodTgt;

        task.StandardPickingInitSec = b.pickingInitStd;
        task.StandardPickingProcessSec = b.pickingProcessStd;
        task.StandardPickingTravelSec = b.pickingTravelStd;

        task.StandardSortingInitSec = b.sortingInitStd;
        task.StandardSortingProcessSec = b.sortingProcessStd;

        task.StandardPackingInitSec = b.packingInitStd;
        task.StandardPackingProcessSec = b.packingProcessStd;

        // Legacy decomposition for unprod
        const rawType = (task.TaskType || '').toLowerCase();
        if (rawType.includes('pick')) {
            task.TaskDirectTimeSec = task.ProductiveDurationSec * (1 - (config.travelRatio || 0.3));
            task.TaskTravelTimeSec = task.ProductiveDurationSec * (config.travelRatio || 0.3);
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
            if (gapMs > breakThresholdMs && gapMs < 7200 * 1000) {
                filled.push({
                    User: task.User,
                    Client: task.Client,
                    WaveCode: 'N/A',
                    JobCode: 'Unassigned',
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
            const taskTypes = new Set<string>();
            const orderCodes = new Set<string>();

            blk.Tasks.forEach((t: any) => {
                prodDur += t.ProductiveDurationSec;
                unprodDur += t.UnproductiveDurationSec;
                direct += t.TaskDirectTimeSec;
                travel += t.TaskTravelTimeSec;
                units += t.Quantity;
                if (t.TaskType) taskTypes.add(t.TaskType);
                if (t.OrderCode && t.OrderCode !== 'Unknown' && t.OrderCode !== '') orderCodes.add(t.OrderCode);
            });

            activityObjectsArr.push({
                id: crypto.randomUUID(),
                User: user,
                Activity: Array.from(taskTypes).join('|'),
                JobCode: blk.JobCode === 'Unassigned' ? null : blk.JobCode,
                Start: blk.Start,
                Finish: blk.Finish,
                ProductiveDurationSec: prodDur,
                UnproductiveDurationSec: unprodDur,
                TaskDirectTimeSec: direct,
                TaskTravelTimeSec: travel,
                NofOrders: orderCodes.size,
                NofTasks: blk.Tasks.length,
                NofUnits: units,
                AvgTaskDurationSec: (prodDur + unprodDur) / blk.Tasks.length,
                AvgTravelDurationSec: travel / blk.Tasks.length
            });
        };

        filledTasks.forEach(task => {
            if (!currentBlock) {
                currentBlock = { JobCode: task.JobCode, Start: task.Start, Finish: task.Finish, Tasks: [task] };
            } else {
                if (task.JobCode === currentBlock.JobCode) {
                    currentBlock.Tasks.push(task);
                    if (task.Finish > currentBlock.Finish) currentBlock.Finish = task.Finish;
                } else {
                    flushBlock(currentBlock);
                    currentBlock = { JobCode: task.JobCode, Start: task.Start, Finish: task.Finish, Tasks: [task] };
                }
            }
        });

        if (currentBlock) flushBlock(currentBlock);
    });

    return { tasks: allFilledTasks, activities: activityObjectsArr };
}

function calculateBenchmarks(
    task: TaskObject,
    isFirst: boolean,
    isNewVisit: boolean,
    isFirstInActivity: boolean,
    isFirstTaskInJob: boolean,
    isFirstTaskInOrder: boolean,
    isNewLine: boolean,
    isNewSku: boolean,
    isFirstPackingTaskInOrder: boolean,
    hasExplicitPutwallDownstream: boolean,
    config: Config
) {
    let pickingInitStd = 0, pickingTravelStd = 0, pickingProcessStd = 0;
    let sortingInitStd = 0, sortingProcessStd = 0;
    let packingInitStd = 0, packingProcessStd = 0;

    let prodStd = 0, prodTgt = 0;

    const taskType = (task.TaskType || '').toLowerCase();
    const flowClass = task.JobType || 'Unknown';

    if (taskType.includes('break') || taskType.includes('delay')) {
        return { pickingInitStd, pickingTravelStd, pickingProcessStd, sortingInitStd, sortingProcessStd, packingInitStd, packingProcessStd, prodStd, prodTgt };
    }

    const applyMultiplier = (act: any) => {
        if (act.bucket === 'Job Overhead') return isFirstTaskInJob ? 1 : 0;
        if (act.bucket === 'Activity Overhead') return isFirstInActivity ? 1 : 0;
        if (act.bucket === 'Location Based') return isNewVisit ? 1 : 0;
        if (act.bucket === 'SKU Base') return isNewSku ? 1 : 0;
        if (act.bucket === 'Line Based') return isNewLine ? 1 : 0;
        if (act.bucket === 'Order Base') {
            if (taskType.includes('pack')) return isFirstPackingTaskInOrder ? 1 : 0;
            return isFirstTaskInOrder ? 1 : 0;
        }
        if (act.bucket === 'Unit Variable') return task.Quantity || 0;
        return task.Quantity || 0;
    };

    const getVar = (cardId: string, bucket: string) => {
        if (!config?.engineeredStandards?.cards) return { std: 0, tgt: 0 };
        const card = config.engineeredStandards.cards.find((c: any) => c.id === cardId);
        if (!card) return { std: 0, tgt: 0 };
        const variable = card.variables.find((v: any) => v.bucket === bucket || v.name === bucket);
        return { std: variable?.value || 0, tgt: variable?.targetValue || 0 };
    };

    const getActs = (cardId: string) => {
        if (!config?.engineeredStandards?.cards) return [];
        const card = config.engineeredStandards.cards.find((c: any) => c.id === cardId);
        return card?.activities || [];
    };

    let pickingCardId = 'picking_generic';
    let sortingCardId = 'sorting_generic';
    let packingCardId = 'packing_duration';

    if (flowClass === 'PUTW') { pickingCardId = 'picking_putwall'; sortingCardId = 'sorting_putwall'; packingCardId = 'packing_putwall'; }
    else if (flowClass === 'OBPP') { pickingCardId = 'picking_obpp'; packingCardId = 'packing_obpp'; }
    else if (flowClass === 'MICP') { pickingCardId = 'picking_micp'; packingCardId = 'packing_micp'; }
    else if (flowClass === 'SICP') { pickingCardId = 'picking_sicp'; packingCardId = 'packing_sicp'; }
    else if (flowClass === 'SIBP') { pickingCardId = 'picking_sibp'; packingCardId = 'packing_sibp'; }
    else if (flowClass === 'IIBP') { pickingCardId = 'picking_iibp'; packingCardId = 'packing_iibp'; }
    else if (flowClass === 'IOBP') { pickingCardId = 'picking_iobp'; packingCardId = 'packing_iobp'; }

    const evaluateCard = (cId: string, applyFirstJobInit: boolean) => {
        let initStd = 0, initTgt = 0;
        let travelStd = 0, travelTgt = 0;
        let processStd = 0, processTgt = 0;

        const cardActs = getActs(cId);
        if (!cardActs) return { initStd, initTgt, travelStd, travelTgt, processStd, processTgt };

        cardActs.forEach((act: any) => {
            const isTravel = act.name.toLowerCase().includes('travel') || act.bucket === 'Travel';
            const isOverhead = act.bucket === 'Job Overhead';
            const mult = applyMultiplier(act);

            const stdLocal = act.value !== undefined ? act.value : act.defaultSeconds !== undefined ? act.defaultSeconds : act.std !== undefined ? act.std : 0;
            const tgtLocal = act.targetValue !== undefined ? act.targetValue : act.targetSeconds !== undefined ? act.targetSeconds : act.tgt !== undefined ? act.tgt : 0;

            const effStd = stdLocal * mult;
            const effTgt = tgtLocal * mult;

            if (isTravel) {
                travelStd += effStd; travelTgt += effTgt;
            } else if (!isOverhead) {
                processStd += effStd; processTgt += effTgt;
            }
        });

        if (applyFirstJobInit && initStd === 0) {
            initStd = getVar(cId, 'Job Overhead').std;
            initTgt = getVar(cId, 'Job Overhead').tgt;

            if (initStd === 0) {
                if (cId === sortingCardId) initStd = getVar('job_init', 'Sorting Init').std;
                if (cId === pickingCardId) initStd = getVar('job_init', 'Picking Init').std;
                if (cId === packingCardId && flowClass !== 'OBPP') {
                    initStd = getVar('job_init', 'Packing Init (Std)').std;
                }
                initTgt = initStd;
            }
        }
        return { initStd, initTgt, travelStd, travelTgt, processStd, processTgt };
    };

    if (taskType.includes('sort')) {
        const sortRes = evaluateCard(sortingCardId, isFirstInActivity);
        sortingInitStd = sortRes.initStd;
        sortingProcessStd = sortRes.processStd;
        prodStd = sortRes.processStd + sortRes.initStd;
        prodTgt = sortRes.processTgt + sortRes.initTgt;
    } else if (taskType.includes('pack')) {
        const packRes = evaluateCard(packingCardId, isFirstTaskInJob);
        packingInitStd = packRes.initStd;
        packingProcessStd = packRes.processStd;
        prodStd = packRes.processStd + packRes.initStd;
        prodTgt = packRes.processTgt + packRes.initTgt;
    } else {
        const pickRes = evaluateCard(pickingCardId, isFirstTaskInJob);
        pickingInitStd = pickRes.initStd;
        pickingTravelStd = pickRes.travelStd;
        pickingProcessStd = pickRes.processStd;

        if (flowClass === 'PUTW' && !hasExplicitPutwallDownstream) {
            const sortRes = evaluateCard(sortingCardId, isFirstTaskInJob);
            sortingInitStd = sortRes.initStd;
            sortingProcessStd = sortRes.processStd;

            const packRes = evaluateCard(packingCardId, isFirstTaskInJob);
            packingInitStd = packRes.initStd;
            packingProcessStd = packRes.processStd;
        }

        prodStd = pickingProcessStd + pickingTravelStd + pickingInitStd + sortingInitStd + sortingProcessStd + packingInitStd + packingProcessStd;
        prodTgt = prodStd; // Simplified: target equals standard
    }

    return { pickingInitStd, pickingTravelStd, pickingProcessStd, sortingInitStd, sortingProcessStd, packingInitStd, packingProcessStd, prodStd, prodTgt };
}
