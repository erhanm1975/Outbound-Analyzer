import type { TaskObject, JobObject, WaveObject, EngineeredStandardsConfig, CalculationCard, MicroActivity } from '../types';

export interface AmortizedRow {
    label: string;
    amortizedStdTime: number;
    amortizedTgtTime: number;
    formula: string;
    isZero: boolean;
    bucket: string;
}

/**
 * Resolves the correct CalculationCard ID using the dynamic mapping in the JSON config.
 */
export function resolveCardId(jobType: string, taskType: string, config: EngineeredStandardsConfig): string | null {
    const typeStr = (taskType || '').toLowerCase();
    let mapKey = 'Picking';
    if (typeStr.includes('sort')) mapKey = 'Sorting';
    if (typeStr.includes('pack')) mapKey = 'Packing';

    const flow = config.jobFlows.find(f => f.acronym === jobType || f.flowClass === jobType);
    if (flow?.mapping && flow.mapping[mapKey]) {
        return flow.mapping[mapKey] || null;
    }
    return null;
}

/**
 * Utility to get a specific bucket value directly from a card's precomputed variables.
 */
function getCardVariable(card: CalculationCard, bucket: string): { std: number, tgt: number } {
    // M4 FIX: Search both card.variables AND card.activities for the bucket
    const variable = card.variables?.find(v => (v as any).bucket === bucket || v.name === bucket);
    if (variable) {
        return {
            std: variable.value || 0,
            tgt: variable.targetValue !== undefined ? variable.targetValue : (variable.value || 0)
        };
    }
    // Fallback: search card.activities for matching bucket
    const activity = card.activities?.find(a => a.bucket === bucket);
    return {
        std: activity?.defaultSeconds || 0,
        tgt: activity?.targetSeconds !== undefined ? activity.targetSeconds : (activity?.defaultSeconds || 0)
    };
}

/**
 * 1. calculateTaskForensics
 * Applies chronological, event-driven multipliers to a single TaskObject.
 */
export function calculateTaskForensics(
    task: TaskObject,
    context: {
        isFirstInJob: boolean;
        isNewVisit: boolean;
        isNewSku: boolean;
        isFirstInOrder: boolean;
        isFirstPackingTaskInOrder: boolean;
        isFirstTaskInJobFlow: boolean;
    },
    config: EngineeredStandardsConfig
): TaskObject {

    // Default zero structures
    task.StandardPickingInitSec = 0; task.StandardPickingTravelSec = 0; task.StandardPickingProcessSec = 0;
    task.StandardSortingInitSec = 0; task.StandardSortingProcessSec = 0;
    task.StandardPackingInitSec = 0; task.StandardPackingProcessSec = 0;

    // Target zero structures
    task.TargetPickingInitSec = 0; task.TargetPickingTravelSec = 0; task.TargetPickingProcessSec = 0;
    task.TargetSortingInitSec = 0; task.TargetSortingProcessSec = 0;
    task.TargetPackingInitSec = 0; task.TargetPackingProcessSec = 0;

    const cardId = resolveCardId(task.JobType || '', task.TaskType || '', config);
    if (!cardId) return task;

    const card = config.cards.find(c => c.id === cardId);
    if (!card) return task;

    const taskType = (task.TaskType || '').toLowerCase();

    let initStd = 0, travelStd = 0, processStd = 0;
    let initTgt = 0, travelTgt = 0, processTgt = 0;

    const applyMultiplier = (act: MicroActivity) => {
        const bucket = act.bucket || '';
        if (bucket === 'Job Overhead') return context.isFirstTaskInJobFlow ? 1 : 0;
        if (bucket === 'Activity Overhead') return context.isFirstTaskInJobFlow ? 1 : 0;
        if (bucket === 'Location Based') return context.isNewVisit ? 1 : 0;
        if (bucket === 'SKU Base') return context.isNewSku ? 1 : 0;
        if (bucket === 'Line Based') return 1;
        if (bucket === 'Order Base') {
            if (taskType.includes('pack')) return context.isFirstPackingTaskInOrder ? 1 : 0;
            return context.isFirstInOrder ? 1 : 0;
        }
        if (bucket.includes('Unit Variable') || bucket.includes('Unit_Variable')) return task.Quantity || 0;
        if (act.name.toLowerCase().includes('unit')) return task.Quantity || 0;
        return task.Quantity || 0;
    };

    (card.activities || []).forEach(act => {
        const isTravel = act.name.toLowerCase().includes('travel') || act.bucket === 'Travel' || act.bucket === 'Location Based';
        const isOverhead = act.bucket === 'Job Overhead' || act.bucket === 'Activity Overhead'; // C2 FIX: both overhead types excluded from processStd
        const mult = applyMultiplier(act);

        const stdLocal = act.defaultSeconds || 0;
        const tgtLocal = act.targetSeconds !== undefined ? act.targetSeconds : stdLocal;

        const effStd = stdLocal * mult;
        const effTgt = tgtLocal * mult;

        if (isTravel) {
            travelStd += effStd; travelTgt += effTgt;
        } else if (!isOverhead) {
            processStd += effStd; processTgt += effTgt;
        }
    });

    if (context.isFirstTaskInJobFlow && initStd === 0) {
        const oh = getCardVariable(card, 'Job Overhead');
        initStd = oh.std;
        initTgt = oh.tgt;
    }

    if (taskType.includes('sort')) {
        task.StandardSortingInitSec = initStd; task.StandardSortingProcessSec = processStd;
        task.TargetSortingInitSec = initTgt; task.TargetSortingProcessSec = processTgt;
    } else if (taskType.includes('pack')) {
        task.StandardPackingInitSec = initStd; task.StandardPackingProcessSec = processStd;
        task.TargetPackingInitSec = initTgt; task.TargetPackingProcessSec = processTgt;
    } else {
        task.StandardPickingInitSec = initStd; task.StandardPickingTravelSec = travelStd; task.StandardPickingProcessSec = processStd;
        task.TargetPickingInitSec = initTgt; task.TargetPickingTravelSec = travelTgt; task.TargetPickingProcessSec = processTgt;
    }

    task.ProductiveDurationStandardSec = (task.StandardPickingInitSec + task.StandardPickingTravelSec + task.StandardPickingProcessSec + task.StandardSortingInitSec + task.StandardSortingProcessSec + task.StandardPackingInitSec + task.StandardPackingProcessSec);
    task.ProductiveDurationTargetSec = (task.TargetPickingInitSec + task.TargetPickingTravelSec + task.TargetPickingProcessSec + task.TargetSortingInitSec + task.TargetSortingProcessSec + task.TargetPackingInitSec + task.TargetPackingProcessSec);

    // Assign generic legacy mappings for components that rely on them (like Timeline Simulation)
    task.TaskDirectTimeStandardSec = initStd + processStd;
    task.TaskDirectTimeTargetSec = initTgt + processTgt;
    task.TaskTravelTimeStandardSec = travelStd;
    task.TaskTravelTimeTargetSec = travelTgt;

    return task;
}

/**
 * 2. calculateJobStandardAndTarget
 * Analyzes an array of tasks for a given Job and returns the absolute JobObject.
 */
export function calculateJobStandardAndTarget(tasks: TaskObject[], config: EngineeredStandardsConfig): JobObject {
    if (!tasks || tasks.length === 0) return createEmptyJobObject('', '', '');

    const jobCode = tasks[0].JobCode || 'Unknown';
    const jobType = tasks[0].JobType || 'Unknown';
    const waveCode = (tasks[0] as any).WaveCode || 'N/A';

    const uniqueOrders = new Set<string>();
    const uniqueLocations = new Set<string>();
    const uniqueSKUs = new Set<string>();
    const uniqueLocSKUs = new Set<string>();

    let totalUnits = 0;

    const pickTasks: TaskObject[] = [];
    const sortTasks: TaskObject[] = [];
    const packTasks: TaskObject[] = [];

    let actualSeconds = 0;

    tasks.forEach(t => {
        const typeStr = (t.TaskType || '').toLowerCase();
        if (typeStr.includes('pick')) pickTasks.push(t);
        else if (typeStr.includes('sort')) sortTasks.push(t);
        else if (typeStr.includes('pack')) packTasks.push(t);

        totalUnits += (t.Quantity || 0);
        if (t.OrderCode && t.OrderCode !== 'Unknown' && t.OrderCode !== '') uniqueOrders.add(t.OrderCode);
        if (t.Location && t.Location !== 'Unknown' && t.Location !== '') uniqueLocations.add(t.Location);
        if (t.SKU && t.SKU !== 'Unknown' && t.SKU !== '') uniqueSKUs.add(t.SKU);
        if (t.Location && t.SKU) uniqueLocSKUs.add(`${t.Location}|${t.SKU}`);

        actualSeconds += (t.ProductiveDurationSec || 0);
    });

    const evaluateFlowType = (taskSubset: TaskObject[], typeKey: 'Picking' | 'Sorting' | 'Packing') => {
        if (taskSubset.length === 0) return { std: 0, tgt: 0 };
        const cardId = resolveCardId(jobType, typeKey, config);
        if (!cardId) return { std: 0, tgt: 0 };

        const card = config.cards.find(c => c.id === cardId);
        if (!card) return { std: 0, tgt: 0 };

        const oh = getCardVariable(card, 'Job Overhead');
        const loc = getCardVariable(card, 'Location Based');
        const sku = getCardVariable(card, 'SKU Base');
        const line = getCardVariable(card, 'Line Based');
        const order = getCardVariable(card, 'Order Base');
        const unit = getCardVariable(card, 'Unit Variable');

        const taskCount = taskSubset.length;

        let flowStd = oh.std;
        let flowTgt = oh.tgt;

        if (typeKey === 'Picking') {
            flowStd += (uniqueLocations.size * loc.std) + (uniqueLocSKUs.size * sku.std) + (taskCount * line.std) + (totalUnits * unit.std);
            flowTgt += (uniqueLocations.size * loc.tgt) + (uniqueLocSKUs.size * sku.tgt) + (taskCount * line.tgt) + (totalUnits * unit.tgt);
        } else if (typeKey === 'Sorting') {
            flowStd += (taskCount * sku.std) + (taskCount * line.std);
            flowTgt += (taskCount * sku.tgt) + (taskCount * line.tgt);
        } else if (typeKey === 'Packing') {
            const packOrds = uniqueOrders.size > 0 ? uniqueOrders.size : 1;
            flowStd += (packOrds * order.std) + (taskCount * line.std) + (totalUnits * unit.std);
            flowTgt += (packOrds * order.tgt) + (taskCount * line.tgt) + (totalUnits * unit.tgt);
        }

        return { std: flowStd, tgt: flowTgt };
    };

    const pickRes = evaluateFlowType(pickTasks, 'Picking');
    const sortRes = evaluateFlowType(sortTasks, 'Sorting');
    const packRes = evaluateFlowType(packTasks, 'Packing');

    return {
        jobCode,
        jobType,
        waveCode,
        taskCount: tasks.length,
        totalUnits,
        totalOrders: uniqueOrders.size,
        totalLocations: uniqueLocations.size,
        totalSKUs: uniqueSKUs.size,

        standardSeconds: pickRes.std + sortRes.std + packRes.std,
        targetSeconds: pickRes.tgt + sortRes.tgt + packRes.tgt,
        actualSeconds,

        pickingStandardSec: pickRes.std,
        sortingStandardSec: sortRes.std,
        packingStandardSec: packRes.std
    };
}

/**
 * 3. calculateWaveContext
 * Rolls up JobObjects into a WaveObject.
 */
export function calculateWaveContext(jobs: JobObject[]): WaveObject | null {
    if (!jobs || jobs.length === 0) return null;

    const waveCode = jobs[0].waveCode || 'Unknown';

    const wave: WaveObject = {
        waveCode,
        jobCount: jobs.length,
        taskCount: 0,
        totalUnits: 0,
        standardSeconds: 0,
        targetSeconds: 0,
        actualSeconds: 0
    };

    jobs.forEach(j => {
        wave.taskCount += j.taskCount;
        wave.totalUnits += j.totalUnits;
        wave.standardSeconds += j.standardSeconds;
        wave.targetSeconds += j.targetSeconds;
        wave.actualSeconds += j.actualSeconds;
    });

    return wave;
}

/**
 * 4. calculateAmortizedDetail
 */
export function calculateAmortizedDetail(
    task: TaskObject,
    config: EngineeredStandardsConfig,
    jobStats: { taskCount: number, locationCount: number, orderCount: number }
): AmortizedRow[] {
    const rows: AmortizedRow[] = [];
    const cardId = resolveCardId(task.JobType || '', task.TaskType || '', config);
    if (!cardId) return rows;

    const card = config.cards.find(c => c.id === cardId);
    if (!card) return rows;

    const N = Math.max(1, jobStats.taskCount);
    const L = Math.max(1, jobStats.locationCount);
    const O = Math.max(1, jobStats.orderCount);

    (card.activities || []).forEach(act => {
        const b = (act.bucket || '').toLowerCase();
        const stdUnit = act.defaultSeconds || 0;
        const tgtUnit = act.targetSeconds !== undefined ? act.targetSeconds : stdUnit;

        let amortizedStd = 0;
        let amortizedTgt = 0;
        let formula = '';

        if (b.includes('unit variable') || b.includes('unit_variable') || act.name.toLowerCase().includes('unit')) {
            const qty = task.Quantity || 0;
            amortizedStd = stdUnit * qty;
            amortizedTgt = tgtUnit * qty;
            formula = `${qty} units × ${stdUnit}s`;
        } else if (b.includes('line')) {
            amortizedStd = stdUnit;
            amortizedTgt = tgtUnit;
            formula = `1 line × ${stdUnit}s`;
        } else if (b.includes('sku')) {
            amortizedStd = stdUnit;
            amortizedTgt = tgtUnit;
            formula = `(${stdUnit}s × ${N} tasks) / ${N} = ${stdUnit}s`;
        } else if (b.includes('location') || b.includes('travel')) {
            amortizedStd = (stdUnit * L) / N;
            amortizedTgt = (tgtUnit * L) / N;
            formula = `(${stdUnit}s × ${L} locs) / ${N} tasks`;
        } else if (b.includes('order') || b.includes('cluster')) {
            amortizedStd = (stdUnit * O) / N;
            amortizedTgt = (tgtUnit * O) / N;
            formula = `(${stdUnit}s × ${O} orders) / ${N} tasks`;
        } else if (b.includes('job') || b.includes('overhead') || b.includes('init')) {
            amortizedStd = stdUnit / N;
            amortizedTgt = tgtUnit / N;
            formula = `${stdUnit}s / ${N} tasks`;
        } else {
            amortizedStd = stdUnit;
            amortizedTgt = tgtUnit;
            formula = `1 × ${stdUnit}s`;
        }

        rows.push({
            label: act.name,
            amortizedStdTime: amortizedStd,
            amortizedTgtTime: amortizedTgt,
            formula,
            bucket: act.bucket || 'Unknown',
            isZero: stdUnit === 0
        });
    });

    return rows;
}

function createEmptyJobObject(jobCode: string, jobType: string, waveCode: string): JobObject {
    return {
        jobCode, jobType, waveCode,
        taskCount: 0, totalUnits: 0, totalOrders: 0, totalLocations: 0, totalSKUs: 0,
        standardSeconds: 0, targetSeconds: 0, actualSeconds: 0,
        pickingStandardSec: 0, sortingStandardSec: 0, packingStandardSec: 0
    };
}
