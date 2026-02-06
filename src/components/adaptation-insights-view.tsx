
import React, { useMemo } from 'react';
import type { ShiftRecord, BufferConfig } from '../types';
import { generateAdaptationInsightsPDF } from '../utils/pdf-generator';
import { generateNotebookLMExport } from '../utils/notebooklm-exporter';
import { Activity, Box, CheckCircle2, Factory, FileDown, FileText, Grid, Layers, List, Settings, Truck, Users } from 'lucide-react';

interface JobDictionaryViewProps {
    data: ShiftRecord[];
    config: BufferConfig;
}

interface DictionaryEntry {
    id: string;
    title: string;
    definition: string;
    aiLogic: string;
    pickingWorkflow: string;
    packingWorkflow: string;
    kpiImpact: string;
    icon: React.ElementType;
    color: string;
    criteriaDescription: string;
}

const DICTIONARY: DictionaryEntry[] = [
    {
        id: 'PUT_TO_WALL',
        title: '1. Put-to-Wall Job',
        definition: 'High-volume batch pick of orders sorted into a physical wall.',
        aiLogic: 'Prioritizes minimum travel by batching massive quantities of disparate SKUs.',
        pickingWorkflow: 'High-speed "bulk harvester".',
        packingWorkflow: 'Items sorted into order-specific cubbies at Sort Wall.',
        kpiImpact: 'Maxes out "Flow Capacity". Spatial savings outweigh secondary sort time.',
        icon: Factory,
        color: 'bg-rose-100 text-rose-700 border-rose-200',
        criteriaDescription: 'Jobs containing "Sorting" tasks.',
    },
    {
        id: 'IDENTICAL_ITEM',
        title: '2. Identical Item Order Job',
        definition: 'A batch where every order has 1 SKU, and the entire job has only 1 SKU.',
        aiLogic: 'Groups all single-unit orders for a high-volume SKU into a single assignment.',
        pickingWorkflow: 'Picker travels to one location and picks total sum of units at once.',
        packingWorkflow: 'Batch Labeling: Scan one item to validate whole batch.',
        kpiImpact: 'Massive reduction in "Distinct Locations Visited".',
        icon: Layers,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        criteriaDescription: 'Job has 1 SKU total, >1 Orders, and every order has 1 SKU.',
    },
    {
        id: 'MIXED_SINGLES',
        title: '3. Single Item Job',
        definition: 'A batch of single-unit orders. Must check: Not Identical Item, All orders 1 SKU/1 Unit, >1 Orders.',
        aiLogic: 'Clusters disparate SKUs based on physical proximity to create shortest "Snake Path".',
        pickingWorkflow: 'Continuous path picking various items into shared container.',
        packingWorkflow: 'Scan-to-Print: Scan any item to identify order.',
        kpiImpact: 'Increases "Density (Locs/Unit)".',
        icon: List,
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        criteriaDescription: 'Orders have 1 Unit/1 SKU, >1 Orders, Not Identical Item Job.',
    },
    {
        id: 'IDENTICAL_ORDERS',
        title: '4. Identical Order Jobs',
        definition: 'Orders that have the exact same combination of items and quantities. Not Identical/Single Item.',
        aiLogic: 'Searches for identical "baskets" across the order pool.',
        pickingWorkflow: 'Visits only locations needed for that SKU combination.',
        packingWorkflow: 'Pulse Flow: Labels applied to pre-staged sets.',
        kpiImpact: 'Reduces "Job Consolidation" costs and boosts Packing UPH.',
        icon: Box,
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        criteriaDescription: 'Multiple orders with exact same SKU+Qty usage. Not Type 2 or 3.',
    },
    {
        id: 'ORDER_BASED',
        title: '5. Order Based Job',
        definition: 'A job containing exactly one order.',
        aiLogic: 'Standard discrete picking for large or special orders.',
        pickingWorkflow: 'Pick & Pass or discrete pick.',
        packingWorkflow: 'Standard pack station.',
        kpiImpact: 'Simple flow but lower density.',
        icon: Truck,
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        criteriaDescription: 'Job contains exactly 1 order.',
    },
    {
        id: 'MULTI_ITEM',
        title: '6. Multi-Item Order Job',
        definition: 'Batch containing multiple orders, not matching previous single/identical profiles.',
        aiLogic: 'Sequences orders so picker touches fewest aisles.',
        pickingWorkflow: 'Sort-While-Picking or Cluster Pick.',
        packingWorkflow: 'Standard pack.',
        kpiImpact: 'Optimizes travel for complex clean batches.',
        icon: Grid,
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        criteriaDescription: 'Multiple orders, mixed SKUs, not fitting Types 2-4.',
    },
    {
        id: 'COMPLEX',
        title: '7. Complex Jobs',
        definition: 'Advanced profiles (Not available for now).',
        aiLogic: 'N/A',
        pickingWorkflow: 'N/A',
        packingWorkflow: 'N/A',
        kpiImpact: 'N/A',
        icon: Settings,
        color: 'bg-slate-100 text-slate-400 border-slate-200',
        criteriaDescription: 'Not Available for now.',
    }
];

const PHASES = [
    {
        id: 'P1',
        title: 'Phase 1: Operational Hygiene & Discipline',
        focus: 'Operational Hygiene',
        outcome: 'Higher Throughput, Lower Admin',
        description: 'In this initial phase, the AI focuses on low-hanging fruit: optimizing order grouping and stop reduction using standard WMS logic data.',
        levers: [
            'Job Type Selection: Deploying Identical Item, Single Item, and Multi-Item batching.',
            'Normalization of Wave Scheduling: Transitioning from "too many small waves" to optimized intervals.',
            'Batch Size Optimization: Correcting equipment under-utilization.',
            'AI Adoption Discipline: Minimizing manual "top-off" waves.'
        ],
        metrics: [
            'Picked UPH / Packed UPH',
            'Distinct Locations Visited',
            'Density (Locs/Unit)'
        ],
        questions: [
            {
                id: 'p1_job_mix',
                text: 'Job Mix: Are you utilizing high-velocity job types?',
                logic: (stats: any, _data: ShiftRecord[], _metadata: any) => {
                    // AI Adaptation Index: Weighted Average of Volume
                    const weights: Record<string, number> = {
                        'IDENTICAL_ITEM': 10,
                        'IDENTICAL_ORDERS': 9,
                        'MIXED_SINGLES': 8,
                        'PUT_TO_WALL': 7,
                        'COMPLEX': 6,
                        'MULTI_ITEM': 5,
                        'ORDER_BASED': 1,
                        'UNKNOWN': 0
                    };

                    let totalWeightedVolume = 0;
                    let grandTotalVolume = 0;

                    Object.entries(stats).forEach(([type, stat]: [string, any]) => {
                        const volume = stat.volume || 0;
                        const weight = weights[type] || 0;
                        totalWeightedVolume += (volume * weight);
                        grandTotalVolume += volume;
                    });

                    const index = grandTotalVolume > 0 ? (totalWeightedVolume / grandTotalVolume) : 0;
                    const result = index >= 6.0; // Threshold for positive sentiment? (User said 6.0-8.9 is Advanced)

                    return {
                        answer: `${index.toFixed(2)} Index`,
                        value: grandTotalVolume > 0 ? `${grandTotalVolume.toLocaleString()} Units Evaluated` : 'No Data',
                        isPositive: result,
                        explanation: 'AI Adaptation Index: Weighted volume flow. (10=Identical Item, 1=Order Based). Target: >6.0',
                        score: Number(index.toFixed(2))
                    };
                }
            },

            {
                id: 'p1_utilization',
                text: 'Under-Utilization: Are batch sizes optimized?',
                logic: (_stats: any, _data: ShiftRecord[], metadata: any) => {
                    // Logic: Ratio of Avg Orders / Standard Capacity (Top 5 Avg)
                    // Target: Put-to-Wall, Mixed Singles, Multi-Item, Complex

                    const avg = metadata.utilization_target_avg_orders || 0;
                    const capacity = metadata.utilization_standard_capacity || 1; // Avoid div by 0
                    const ratio = avg / capacity;

                    const isOptimized = ratio >= 0.8;
                    const pct = (ratio * 100).toFixed(2);

                    return {
                        answer: isOptimized ? 'Yes' : 'Potential Waste',
                        value: `${pct}% Capacity Used`,
                        isPositive: isOptimized,
                        explanation: `Utilization Ratio: ${avg.toFixed(2)} Avg / ${capacity.toFixed(2)} Standard Capacity (Top 5 Avg). Target: >80%.`,
                        score: Math.min(10, Math.round(ratio * 10))
                    };
                }
            },
            {
                id: 'p1_scheduling',
                text: 'Scheduling: Is the wave schedule consolidated?',
                logic: (_stats: any, _data: ShiftRecord[], metadata: any) => {
                    const waveCount = metadata.totalWaves || 1;
                    const vol = metadata.totalVolume || 0;
                    const avgVol = vol / waveCount;
                    // Heuristic: If avg wave is < 100 units, it's fragmented?
                    const result = avgVol > 100;
                    return {
                        answer: result ? 'Yes' : 'Fragmented',
                        value: `${avgVol.toFixed(2)} Units/Wave`,
                        isPositive: result,
                        explanation: `Divided Total Volume (${vol}) by Total Wave Count (${waveCount}). Small waves indicate fragmentation.`,
                        score: Math.min(10, Math.round((avgVol / 100) * 10))
                    }
                }
            }
        ]
    },
    {
        id: 'P2',
        title: 'Phase 2: Layout Intelligence',
        focus: 'Travel Waste',
        outcome: 'Reduced Fatigue, Faster Path',
        description: 'Once the building layout (X, Y coordinates) is uploaded, the AI stops guessing about travel and begins calculating the true "Snake Path".',
        levers: [
            '2D Layout Integration: Using physical distance between bins.',
            'Snake Path Calculation: Minimizing backtracking and cross-alley travel.'
        ],
        metrics: [
            'Transition Friction',
            'Active Scan Ratio',
            'UPH (Pure Active)',
            'Average Task Duration'
        ],
        questions: [
            {
                id: 'p2_density',
                text: 'Distance Logic: Is density optimized?',
                logic: (_stats: any, _data: ShiftRecord[], metadata: any, config: BufferConfig) => {
                    // Check Configuration First
                    if (config.is2DLayoutUsed) {
                        return {
                            answer: 'Implemented',
                            value: '2D Layout Active',
                            isPositive: true,
                            explanation: '2D Layout implementation logic is active.',
                            score: 10
                        };
                    }
                    if (!config.is2DLayoutUsed) {
                        return {
                            answer: 'N/A',
                            value: 'Config Required',
                            isPositive: false,
                            explanation: 'Requires 2D Layout configuration.',
                            score: 0
                        };
                    }
                    // Visits Per Unit. Lower is better.
                    const vpu = metadata.visitsPerUnit || 0;
                    const result = vpu < 1.2; // Good density
                    return {
                        answer: result ? 'High Density' : 'Low Density',
                        value: `${vpu.toFixed(2)} Visits/Unit`,
                        isPositive: result,
                        explanation: 'Analyzed "Visits per Unit" KPI. Lower values (< 1.2) indicate effective spatial batching.',
                        // Logic: 1.0 = 10, 2.0 = 0.
                        score: Math.max(0, Math.min(10, Math.round((2.0 - vpu) * 10)))
                    };
                }
            }
        ]
    },
    {
        id: 'P3',
        title: 'Phase 3: Multi-Client Synergy',
        focus: '3PL Consolidation',
        outcome: 'Cross-Client Labor Savings',
        description: 'In a 3PL environment, the AI breaks the "Client Silo" to find efficiency across different customers, even when inventory is not shared.',
        levers: [
            'Spatial Overlap: Identifying orders for different clients in same aisles.',
            'Path Consolidation: Merging travel paths across accounts.'
        ],
        metrics: [
            'SKU Batchability (Spatial)',
            'Average Units/Job (Depth)'
        ],
        questions: [
            {
                id: 'p3_sharing',
                text: 'Account Sharing: Are pickers picking for multiple clients in a single trip?',
                logic: (_stats: any, _data: ShiftRecord[], metadata: any) => {
                    const multiClientCount = metadata.multiClientJobCount || 0;
                    const result = multiClientCount > 0;
                    return {
                        answer: result ? 'Yes' : 'No',
                        value: `${multiClientCount} Jobs`,
                        isPositive: result,
                        explanation: 'Scanned all jobs to identify assignments containing orders from >1 distinct client.',
                        score: result ? 10 : 0
                    };
                }
            }
        ]
    },
    {
        id: 'P4',
        title: 'Phase 4: Engineered Labor Standards & ML',
        focus: 'Predictability',
        outcome: 'Perfect Shipping Cut-off Hits',
        description: 'The system stops using "static" assumptions and starts learning the behavioral reality of the specific warehouse.',
        levers: [
            'Execution Learning: Monitoring actual task times vs assumptions.',
            'Dynamic Prediction: Predicting exact wave completion times.'
        ],
        metrics: [
            'Completion Prediction Accuracy',
            'Pick-to-Pack Sync'
        ],
        questions: [
            {
                id: 'p4_predict',
                text: 'Predictive Planning: Is completion time predictable?',
                logic: (stats: any, data: ShiftRecord[], metadata: any, config: BufferConfig) => {
                    if (config.isEngineeredStandardsUsed) {
                        return {
                            answer: 'Implemented',
                            value: 'Standards Active',
                            isPositive: true,
                            explanation: 'Engineered Labor Standards logic is active.',
                            score: 10
                        };
                    }

                    if (!config.isEngineeredStandardsUsed) {
                        return {
                            answer: 'N/A',
                            value: 'Config Required',
                            isPositive: false,
                            explanation: 'Requires Engineered Standards configuration.',
                            score: 0
                        };
                    }

                    return {
                        answer: 'Unknown',
                        value: 'No Plan Data',
                        isPositive: false,
                        explanation: 'Cannot verify without "Planned vs Actual" timestamps in dataset.',
                        score: 0
                    };
                }
            }
        ]
    },
    {
        id: 'P5',
        title: 'Phase 5: Advanced Fulfillment Flows',
        focus: 'High Capacity',
        outcome: 'Peak Season Scalability',
        description: 'The final phase introduces sophisticated physical flows that require high-coordination logic.',
        levers: [
            'Advanced Setups: Enabling Put-to-Wall and Mixed Tote Carts.',
            'Flow Optimization: Simultaneously picking singles, identicals, and multis.'
        ],
        metrics: [
            'Flow Capacity (Hr)',
            'Lines per Job'
        ],
        questions: [
            {
                id: 'p5_complex',
                text: 'Complex Flows: Are you utilizing Put-to-Wall?',
                logic: (stats: any) => {
                    // Check specifically for Put-to-Wall (Sorting workflows)
                    const ptwCount = stats.PUT_TO_WALL.count;
                    const result = ptwCount > 0;
                    return {
                        answer: result ? 'Yes' : 'No',
                        value: `${ptwCount} Jobs`,
                        isPositive: result,
                        explanation: 'Checked for "Put-to-Wall" (Sorting tasks).',
                        score: result ? 10 : 0
                    };
                }
            },
            {
                id: 'p5_mixed_tote',
                text: 'Complex Flows: Are you utilizing Mixed Tote Carts?',
                logic: (stats: any) => {
                    return {
                        answer: 'Not Available',
                        value: 'N/A',
                        isPositive: false,
                        explanation: 'Mixed Tote Carts logic is currently unavailable.',
                        score: 0
                    };
                }
            }
        ]
    }
];

export function AdaptationInsightsView({ data, config }: JobDictionaryViewProps) {

    // HEURISTIC CLASSIFICATION ENGINE
    const analysis = useMemo(() => {
        const stats = {
            [DICTIONARY[0].id]: { count: 0, volume: 0, jobs: [] as string[] }, // PUT_TO_WALL
            [DICTIONARY[1].id]: { count: 0, volume: 0, jobs: [] as string[] }, // IDENTICAL_ITEM
            [DICTIONARY[2].id]: { count: 0, volume: 0, jobs: [] as string[] }, // MIXED_SINGLES
            [DICTIONARY[3].id]: { count: 0, volume: 0, jobs: [] as string[] }, // IDENTICAL_ORDERS
            [DICTIONARY[4].id]: { count: 0, volume: 0, jobs: [] as string[] }, // ORDER_BASED
            [DICTIONARY[5].id]: { count: 0, volume: 0, jobs: [] as string[] }, // MULTI_ITEM
            [DICTIONARY[6].id]: { count: 0, volume: 0, jobs: [] as string[] }, // COMPLEX
            'UNKNOWN': { count: 0, volume: 0, jobs: [] as string[] }
        };

        // Metadata for Phases
        let multiClientJobCount = 0;
        let totalUnits = 0;
        let totalUniqueVisits = 0; // Job+Loc
        // Metadata for Utilization Logic
        let utilTargetJobCount = 0;
        let utilTargetTotalOrders = 0;
        const utilTargetOrderCounts: number[] = [];
        const utilTargetTypes = new Set(['PUT_TO_WALL', 'MIXED_SINGLES', 'MULTI_ITEM', 'COMPLEX']);

        const waves = new Set<string>();

        // 1. Group tasks by JobCode
        const jobs = new Map<string, {
            jobType: string;
            taskTypes: Set<string>;
            taskCount: number;
            orders: Map<string, {
                skus: Map<string, number>; // SKU -> Qty
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
            if (d.TaskType) job.taskTypes.add(d.TaskType);
            job.taskCount++;
            job.allSkus.add(d.SKU);
            if (d.Client) job.clients.add(d.Client);
            if (d.WaveCode) waves.add(d.WaveCode);
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
            // Note: distinct visits calculation is complex here without unique ID, 
            // but we can estimate visits/unit later
        });

        const totalJobs = jobs.size;

        // 2. Classify each job
        jobs.forEach((job, jobCode) => {
            let type = 'UNKNOWN';

            if (job.clients.size > 1) multiClientJobCount++;

            // Calc explicit visits (Job + Loc)
            totalUniqueVisits += job.locations.size;

            const taskTypes = Array.from(job.taskTypes).map(t => t.toLowerCase());
            const hasSorting = taskTypes.some(t => t.includes('sort') || t.includes('wall'));

            // Stats
            const jobUniqueSkus = job.allSkus.size;
            const orders = Array.from(job.orders.values());
            const orderCount = orders.length;

            // Order Logic Checks
            const allOrdersHave1Sku = orders.every(o => o.totalSkus === 1);
            const allOrdersHave1SkuAnd1Unit = orders.every(o => o.totalSkus === 1 && o.totalUnits === 1);

            // Check for identical orders
            // Create a signature for each order: "SKU1:Qty1|SKU2:Qty2"
            const signatures = new Set<string>();
            orders.forEach(o => {
                const sig = Array.from(o.skus.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([sku, qty]) => `${sku}:${qty}`)
                    .join('|');
                signatures.add(sig);
            });
            const areAllOrdersIdentical = signatures.size === 1;

            // Calculate total volume (units) for this job
            const jobVolume = orders.reduce((sum, o) => sum + o.totalUnits, 0);

            // --- STRICT HIERARCHY LOGIC 1-7 (User Defined) ---

            if (hasSorting) {
                // 1. Put-to-Wall (Sorting tasks)
                type = 'PUT_TO_WALL';
            } else if (jobUniqueSkus === 1 && allOrdersHave1Sku && orderCount > 1) {
                // 2. Identical Item Order Job
                // Job must have 1 SKU total, each order 1 SKU, >1 Order
                type = 'IDENTICAL_ITEM';
            } else if (allOrdersHave1SkuAnd1Unit && orderCount >= 2) {
                // 3. Single Item Job (Mixed Singles)
                // Not #2 (Checked above), All orders 1 SKU + 1 Unit, >=2 Orders
                type = 'MIXED_SINGLES';
            } else if (areAllOrdersIdentical && orderCount >= 2) {
                // 4. Identical Order Jobs
                // Not #2, #3. All orders exact same signature. >=2 Orders.
                type = 'IDENTICAL_ORDERS';
            } else if (orderCount === 1) {
                // 5. Order Based Job
                // Only 1 order in the job
                type = 'ORDER_BASED';
            } else if (orderCount > 1) {
                // 6. Multi-Item Order Job
                // Not #2,3,4,5. Multiple orders.
                type = 'MULTI_ITEM';
            } else {
                // 7. Complex Jobs (Not available for now)
                type = 'COMPLEX';
            }


            // Utilization Logic: Check if this job is in the "Target Scope" for under-utilization check
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
                stats['UNKNOWN'].count++;
                stats['UNKNOWN'].volume += jobVolume;
            }
        });

        // Calculate Standard Capacity (Avg of Top 5)
        utilTargetOrderCounts.sort((a, b) => b - a); // Descending
        const top5 = utilTargetOrderCounts.slice(0, 5);
        const top5Sum = top5.reduce((sum, val) => sum + val, 0);
        const standardCapacity = top5.length > 0 ? top5Sum / top5.length : 1;

        const metadata = {
            totalWaves: waves.size,
            totalVolume: totalUnits,
            avgUnitsPerJob: totalJobs > 0 ? totalUnits / totalJobs : 0,
            visitsPerUnit: totalUnits > 0 ? totalUniqueVisits / totalUnits : 0,
            multiClientJobCount,

            // Utilization Metrics (Target Scope: PTW, Mixed Singles, Multi, Complex)
            utilization_target_avg_orders: utilTargetJobCount > 0 ? utilTargetTotalOrders / utilTargetJobCount : 0,
            utilization_standard_capacity: standardCapacity
        };

        return { stats, totalJobs, metadata };
    }, [data]);

    const totalJobs = analysis.totalJobs;

    // CALCULATE SCORES
    const scoreData = useMemo(() => {
        const scores: Record<string, { score: number, results: any[] }> = {};

        PHASES.forEach(phase => {
            const results = phase.questions.map(q => q.logic(analysis.stats, data, analysis.metadata, config));
            let totalScore = 0;
            results.forEach(r => { totalScore += (r.score || 0); });
            const avgScore = results.length > 0 ? (totalScore / results.length) : 0;

            scores[phase.id] = {
                score: avgScore,
                results: results
            };
        });

        // Unified Score Calculation
        // P1: 40%, P2: 20%, P3: 15%, P4: 10%, P5: 15%
        const weightedScore =
            (scores['P1'].score * 0.40) +
            (scores['P2'].score * 0.20) +
            (scores['P3'].score * 0.15) +
            (scores['P4'].score * 0.10) +
            (scores['P5'].score * 0.15);

        // Classification
        let label = 'Foundational';
        let color = 'text-red-600';
        let bg = 'bg-red-50 border-red-200';
        let desc = 'Relying primarily on manual or basic batching logic.';

        if (weightedScore > 8.5) {
            label = 'Elite / Autonomous';
            color = 'text-emerald-700';
            bg = 'bg-emerald-50 border-emerald-200';
            desc = 'Benchmark facility. Operation is fully optimized.';
        } else if (weightedScore >= 6.0) {
            label = 'High-Performing';
            color = 'text-blue-700';
            bg = 'bg-blue-50 border-blue-200';
            desc = 'Modern AI-driven operation with minor manual friction.';
        } else if (weightedScore >= 3.0) {
            label = 'Developing';
            color = 'text-amber-700';
            bg = 'bg-amber-50 border-amber-200';
            desc = 'Transitioning away from legacy WMS constraints.';
        }

        return { scores, weightedScore, label, color, bg, desc };
    }, [analysis, data, config]);

    const handleExportPDF = () => {
        generateAdaptationInsightsPDF(analysis.stats, scoreData, totalJobs);
    };

    const handleExportNotebookLM = () => {
        generateNotebookLMExport(analysis.stats, scoreData, totalJobs, analysis.metadata);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            {/* EXPORT BUTTONS */}
            <div className="flex justify-end gap-3 mb-6">
                <button
                    onClick={handleExportNotebookLM}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                    <FileText className="w-5 h-5" />
                    Export for NotebookLM
                </button>
                <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                    <FileDown className="w-5 h-5" />
                    Export PDF Report
                </button>
            </div>
            {/* UNIFIED MATURITY SCORE HERO */}
            <div className={`p-8 rounded-2xl border ${scoreData.bg} relative overflow-hidden`}>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-2">Unified AI Maturity Score</h2>
                        <div className="flex items-baseline gap-4">
                            <span className={`text-6xl font-black ${scoreData.color}`}>
                                {scoreData.weightedScore.toFixed(2)}
                            </span>
                            <span className="text-2xl font-bold opacity-40">/ 10</span>
                        </div>
                        <div className="mt-4">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border bg-white/50 ${scoreData.color} border-current`}>
                                {scoreData.label}
                            </span>
                        </div>
                        <p className={`mt-4 max-w-md text-sm font-medium opacity-80 ${scoreData.color}`}>
                            {scoreData.desc}
                        </p>
                    </div>

                    {/* Radial or Bar Viz */}
                    <div className="flex-1 w-full max-w-lg space-y-3">
                        {/* Phase Breakdown */}
                        {PHASES.map(phase => {
                            const score = scoreData.scores[phase.id].score;
                            const weightMap: any = { 'P1': '40%', 'P2': '20%', 'P3': '15%', 'P4': '10%', 'P5': '15%' };
                            return (
                                <div key={phase.id} className="flex items-center gap-4 text-sm">
                                    <div className="w-12 font-bold opacity-50">{phase.id}</div>
                                    <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${score >= 7 ? 'bg-emerald-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${score * 10}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-right font-mono font-bold">{score.toFixed(2)}</div>
                                    <div className="w-12 text-xs opacity-40 text-right">w: {weightMap[phase.id]}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            {/* JOB IDENTIFICATION (DICTIONARY) */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                        <Box className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Job Identification</h2>
                        <p className="text-slate-500">Automated classification of optimization profiles</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {DICTIONARY.map(entry => {
                        const stat = analysis.stats[entry.id];
                        const percentage = totalJobs > 0 ? ((stat.count / totalJobs) * 100).toFixed(2) : '0.00';
                        const isActive = stat.count > 0;
                        const Icon = entry.icon;

                        return (
                            <div
                                key={entry.id}
                                className={`
                                    relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-lg
                                    ${isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-80'}
                                `}
                            >
                                <div className={`h-2 w-full ${isActive ? entry.color.split(' ')[0] : 'bg-slate-200'}`} />
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className={`p-3 rounded-lg ${isActive ? entry.color : 'bg-slate-200 text-slate-400'}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-slate-900">
                                                {stat.count.toLocaleString()}
                                            </div>
                                            <div className="text-sm font-medium text-slate-500">
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 leading-tight mb-2">
                                            {entry.title}
                                        </h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {entry.definition}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                            {isActive ? 'Detected' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
                                        <div className="pt-2 text-[10px] text-slate-400 italic">
                                            Detection: {entry.criteriaDescription}
                                        </div>

                                        {/* SAMPLE JOBS FOR VERIFICATION */}
                                        {isActive && stat.jobs.length > 0 && (
                                            <div className="pt-2">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sample Job IDs:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {stat.jobs.slice(0, 3).map((jobId: string) => (
                                                        <span key={jobId} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono border border-slate-200">
                                                            {jobId}
                                                        </span>
                                                    ))}
                                                    {stat.jobs.length > 3 && (
                                                        <span className="px-1.5 py-0.5 text-[10px] text-slate-400">+{stat.jobs.length - 3} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PHASE ADAPTATION INSIGHTS */}
            <div className="space-y-6 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Phase Adaptation Insights</h2>
                        <p className="text-slate-500">Diagnostic assessment of operational maturity</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {PHASES.map(phase => {
                        const phaseData = scoreData.scores[phase.id];
                        const score = phaseData.score;
                        const results = phaseData.results;

                        let scoreColor = 'text-red-500';
                        if (score >= 7) scoreColor = 'text-emerald-500';
                        else if (score >= 4) scoreColor = 'text-amber-500';

                        return (
                            <div key={phase.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{phase.title}</h3>
                                        <div className="flex gap-4 mt-1 text-sm text-slate-500">
                                            <span>Focus: <strong className="text-slate-700">{phase.focus}</strong></span>
                                            <span>•</span>
                                            <span>Make or Break: <strong className="text-slate-700">{phase.outcome}</strong></span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`px-4 py-1 bg-white rounded-lg shadow-sm border border-slate-100 flex flex-col items-center`}>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                                            <span className={`text-xl font-black ${scoreColor}`}>
                                                {score.toFixed(0)}<span className="text-slate-300 text-sm">/10</span>
                                            </span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-100 select-none">
                                            {phase.id}
                                        </div>
                                    </div>
                                </div>

                                {/* PHASE DETAIL HEADER (DESCRIPTION & LEVERS) */}
                                <div className="px-6 py-4 bg-white space-y-4 border-b border-slate-100">
                                    <p className="text-slate-600 text-sm leading-relaxed">{phase.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Key Operational Levers</h4>
                                            <ul className="space-y-1">
                                                {phase.levers.map((lever, i) => (
                                                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                                        <span className="text-slate-400 mt-0.5">•</span>
                                                        <span>{lever}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Impacted Metrics</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {phase.metrics.map((metric, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 font-medium">
                                                        {metric}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {phase.questions.map((q, idx) => {
                                        const analysisResult = results[idx]; // Reuse result
                                        return (
                                            <div key={q.id} className="p-6 hover:bg-slate-50/50 transition-colors grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                                <div className="md:col-span-1">
                                                    <p className="font-medium text-slate-800">{q.text}</p>
                                                </div>
                                                <div className="md:col-span-1">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`px-4 py-1.5 rounded-lg text-sm font-bold border ${analysisResult.isPositive
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                {analysisResult.answer}
                                                            </div>
                                                            <span className="text-sm font-mono text-slate-400">
                                                                ({analysisResult.value})
                                                            </span>
                                                        </div>
                                                        {/* Score Badge */}
                                                        <div>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${analysisResult.score !== undefined && analysisResult.score >= 5
                                                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                                                : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                                Score: {analysisResult.score !== undefined ? analysisResult.score : 0}/10
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-1 text-xs text-slate-500 leading-relaxed pl-4 border-l border-slate-100 italic">
                                                    Method: {analysisResult.explanation}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}


