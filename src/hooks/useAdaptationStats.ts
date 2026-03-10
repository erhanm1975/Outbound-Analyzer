import { useMemo } from 'react';
import type { ShiftRecord, BufferConfig } from '../types/index';
import { AdaptationJobProfile, TaskTypeId } from '../config/process-flows';

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

export interface AdaptationStatsResult {
    stats: Record<string, { count: number; volume: number; jobs: string[] }>;
    totalJobs: number;
    metadata: {
        totalWaves: number;
        totalVolume: number;
        avgUnitsPerJob: number;
        visitsPerUnit: number;
        multiClientJobCount: number;
        multiTenantLocs: number;
        utilization_target_avg_orders: number;
        utilization_standard_capacity: number;
    };
    aiOrderPct: number;
    adaptationIndex: number;
}

// ----------------------------------------------------------------------
// HOOK
// ----------------------------------------------------------------------

export function useAdaptationStats(data: ShiftRecord[], config: BufferConfig): AdaptationStatsResult | null {
    return useMemo(() => {
        if (!data || data.length === 0) return null;

        const stats = {
            [TaskTypeId.PUT_TO_WALL]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.IDENTICAL_ITEM]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.MIXED_SINGLES]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.IDENTICAL_ORDERS]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.ORDER_BASED]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.MULTI_ITEM]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.COMPLEX]: { count: 0, volume: 0, jobs: [] as string[] },
            [AdaptationJobProfile.UNKNOWN]: { count: 0, volume: 0, jobs: [] as string[] }
        };

        let multiClientJobCount = 0;
        let totalUnits = 0;
        let totalUniqueVisits = 0;
        let utilTargetJobCount = 0;
        let utilTargetTotalOrders = 0;
        const utilTargetOrderCounts: number[] = [];
        const utilTargetTypes = new Set<string>([
            AdaptationJobProfile.PUT_TO_WALL,
            AdaptationJobProfile.MIXED_SINGLES,
            AdaptationJobProfile.MULTI_ITEM,
            AdaptationJobProfile.COMPLEX
        ]);

        const waves = new Set<string>();
        const locationClients = new Map<string, Set<string>>();

        // AI Order Penetration Metric Calculation
        const orderAIMap = new Map<string, boolean>();

        const jobs = new Map<string, {
            jobType: string;
            taskTypes: Set<string>;
            taskCount: number;
            orders: Map<string, {
                skus: Map<string, number>;
                totalUnits: number;
                totalSkus: number;
                client?: string;
            }>;
            allSkus: Set<string>;
            clients: Set<string>;
            waveCode: string;
            locations: Set<string>;
        }>();

        data.forEach(d => {
            // Track AI Orders
            if (!orderAIMap.has(d.OrderCode)) {
                orderAIMap.set(d.OrderCode, !!d.IsAI);
            } else if (d.IsAI) {
                orderAIMap.set(d.OrderCode, true);
            }

            if (!jobs.has(d.JobCode)) {
                jobs.set(d.JobCode, {
                    jobType: d.JobType,
                    taskTypes: new Set(),
                    taskCount: 0,
                    orders: new Map(),
                    allSkus: new Set(),
                    clients: new Set(),
                    waveCode: d.WaveCode || 'Unknown',
                    locations: new Set()
                });
            }

            const job = jobs.get(d.JobCode)!;
            job.taskTypes.add(d.TaskType);
            job.taskCount++;
            if (d.WaveCode) waves.add(d.WaveCode);
            if (d.Client) job.clients.add(d.Client);

            if (d.Client && d.Location) {
                if (!locationClients.has(d.Location)) locationClients.set(d.Location, new Set());
                locationClients.get(d.Location)!.add(d.Client);
            }

            const taskType = (d.TaskType || '').toLowerCase();
            const isPicking = taskType.includes('pick') || taskType.includes('replen') || taskType.includes('put');

            if (isPicking) {
                job.allSkus.add(d.SKU);
                job.locations.add(d.Location);

                if (!job.orders.has(d.OrderCode)) {
                    job.orders.set(d.OrderCode, { skus: new Map(), totalUnits: 0, totalSkus: 0, client: d.Client });
                }
                const order = job.orders.get(d.OrderCode)!;
                if (!order.skus.has(d.SKU)) {
                    order.skus.set(d.SKU, 0);
                    order.totalSkus++;
                }
                const currentQty = order.skus.get(d.SKU) || 0;
                order.skus.set(d.SKU, currentQty + d.Quantity);
                order.totalUnits += d.Quantity;

                totalUnits += d.Quantity;
            }
        });

        const totalJobs = jobs.size;

        jobs.forEach((job, jobCode) => {
            let type: string = AdaptationJobProfile.UNKNOWN;

            if (job.clients.size > 1) multiClientJobCount++;
            totalUniqueVisits += job.locations.size;

            const taskTypes = Array.from(job.taskTypes).map(t => t.toLowerCase());
            const hasSorting = taskTypes.some(t => t.includes('sort') || t.includes('wall'));

            const jobUniqueSkus = job.allSkus.size;
            const orders = Array.from(job.orders.values());
            const orderCount = orders.length;

            const allOrdersHave1Sku = orders.every(o => o.totalSkus === 1);
            const allOrdersHave1SkuAnd1Unit = orders.every(o => o.totalSkus === 1 && o.totalUnits === 1);

            const signatures = new Set<string>();
            orders.forEach(o => {
                const sig = Array.from(o.skus.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([sku, qty]) => `${sku}:${qty}`)
                    .join('|');
                signatures.add(sig);
            });
            const areAllOrdersIdentical = signatures.size === 1;

            const jobVolume = orders.reduce((sum, o) => sum + o.totalUnits, 0);

            if (hasSorting) {
                type = TaskTypeId.PUT_TO_WALL;
            } else if (jobUniqueSkus === 1 && allOrdersHave1Sku && orderCount > 1) {
                type = AdaptationJobProfile.IDENTICAL_ITEM;
            } else if (allOrdersHave1SkuAnd1Unit && orderCount >= 2) {
                type = AdaptationJobProfile.MIXED_SINGLES;
            } else if (areAllOrdersIdentical && orderCount >= 2) {
                type = AdaptationJobProfile.IDENTICAL_ORDERS;
            } else if (orderCount === 1) {
                type = AdaptationJobProfile.ORDER_BASED;
            } else if (orderCount > 1) {
                type = AdaptationJobProfile.MULTI_ITEM;
            } else {
                type = AdaptationJobProfile.COMPLEX;
            }

            if (utilTargetTypes.has(type)) {
                utilTargetJobCount++;
                utilTargetTotalOrders += orderCount;
                utilTargetOrderCounts.push(orderCount);
            }

            if (stats[type]) {
                stats[type].count++;
                stats[type].volume += jobVolume;
                stats[type].jobs.push(jobCode);
            } else {
                stats[AdaptationJobProfile.UNKNOWN].count++;
                stats[AdaptationJobProfile.UNKNOWN].volume += jobVolume;
            }
        });

        const capN = config.utilizationCap || 5;
        utilTargetOrderCounts.sort((a, b) => b - a);
        const topN = utilTargetOrderCounts.slice(0, capN);
        const topNSum = topN.reduce((sum, val) => sum + val, 0);
        const standardCapacity = topN.length > 0 ? topNSum / topN.length : 1;

        const metadata = {
            totalWaves: waves.size,
            totalVolume: totalUnits,
            avgUnitsPerJob: totalJobs > 0 ? totalUnits / totalJobs : 0,
            visitsPerUnit: totalUnits > 0 ? totalUniqueVisits / totalUnits : 0,
            multiClientJobCount,
            multiTenantLocs: Array.from(locationClients.values()).filter(clients => clients.size > 1).length,
            utilization_target_avg_orders: utilTargetJobCount > 0 ? utilTargetTotalOrders / utilTargetJobCount : 0,
            utilization_standard_capacity: standardCapacity
        };

        // Output calculation: AI Penetration Pct
        const mappedOrders = orderAIMap.size;
        const manualOrders = Array.from(orderAIMap.values()).filter(isAI => !isAI).length;
        const aiOrders = mappedOrders - manualOrders;
        const aiOrderPct = mappedOrders > 0 ? (aiOrders / mappedOrders) * 100 : 0;

        // Output calculation: Adaptation Index
        const indexWeights: Record<string, number> = {
            [TaskTypeId.PUT_TO_WALL]: 7,
            [AdaptationJobProfile.COMPLEX]: 6,
            [AdaptationJobProfile.MULTI_ITEM]: 5,
            [AdaptationJobProfile.ORDER_BASED]: 1,
            [AdaptationJobProfile.UNKNOWN]: 0
        };

        let totalWeightedVolume = 0;
        let grandTotalVolume = 0;

        Object.entries(stats).forEach(([type, stat]) => {
            const volume = stat.volume || 0;
            const weight = indexWeights[type] || 0;
            totalWeightedVolume += (volume * weight);
            grandTotalVolume += volume;
        });

        const adaptationIndex = grandTotalVolume > 0 ? (totalWeightedVolume / grandTotalVolume) : 0;

        return { stats, totalJobs, metadata, aiOrderPct, adaptationIndex };
    }, [data, config.utilizationCap]);
}
