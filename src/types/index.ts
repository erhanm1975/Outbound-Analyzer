import { z } from 'zod';

export const ShiftRecordSchema = z.object({
    Account: z.preprocess((val) => val == null ? undefined : String(val), z.string().optional()),
    Client: z.preprocess((val) => val == null ? undefined : String(val), z.string().optional()),
    Warehouse: z.preprocess((val) => val == null ? undefined : String(val), z.string().optional()),
    WaveCode: z.preprocess((val) => val == null ? undefined : String(val), z.string().optional()),
    JobCode: z.preprocess((val) => String(val), z.string()),
    JobType: z.preprocess((val) => String(val), z.string()),
    AIJobDescription: z.preprocess((val) => val == null ? undefined : String(val), z.string().optional()),
    OrderCode: z.preprocess((val) => String(val), z.string()),
    TaskType: z.preprocess((val) => String(val), z.string()),
    SKU: z.preprocess((val) => String(val), z.string()),
    Quantity: z.preprocess((val) => Number(val), z.number().nonnegative()),
    Zone: z.preprocess((val) => val == null ? undefined : String(val), z.string().optional()),
    Location: z.preprocess((val) => String(val), z.string()),
    User: z.preprocess((val) => String(val), z.string()),
    Start: z.preprocess((val) => {
        if (val instanceof Date) return val;
        if (typeof val === 'string' || typeof val === 'number') return new Date(val);
        return val;
    }, z.date()),
    Finish: z.preprocess((val) => {
        if (val instanceof Date) return val;
        if (typeof val === 'string' || typeof val === 'number') return new Date(val);
        return val;
    }, z.date()),
    IsAI: z.preprocess((val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === '1') return true;
            if (lower === 'false' || lower === 'no' || lower === '0') return false;
        }
        if (typeof val === 'number') return val === 1;
        return undefined;
    }, z.boolean().optional()),
    filename: z.string().optional(), // Added for benchmarking
});

export type ShiftRecord = z.infer<typeof ShiftRecordSchema>;

export interface BufferConfig {
    intraJobBuffer: number; // minutes
    jobTransitionBuffer: number; // minutes
    alertThreshold: number; // minutes
    isIntraJobBufferAutoCalculated?: boolean; // Track if auto-calculated vs manual override
    is2DLayoutUsed?: boolean;

    isEngineeredStandardsUsed?: boolean;
    flowBucketInterval?: number; // default 10
    flowExcludeEmpty?: boolean; // default true
    flowCalculationMethod?: 'interval' | 'user_daily_average'; // default 'interval'
    smoothingTolerance?: number; // default 2 seconds
    breakThreshold?: number; // default 300 seconds
    travelRatio?: number; // default 0.70
    utilizationCap?: number; // default 5 (Top 5)

    // NEW: Engineered Standards Integration
    globalShiftParams?: GlobalShiftParams;
    engineeredStandards?: EngineeredStandardsConfig;
}

export interface JobTimingMetrics {
    // Inter-job gap (downtime between jobs)
    avgInterJobGapMin: number;
    medianInterJobGapMin: number;
    p90InterJobGapMin: number;

    // Job cycle time (frequency - time between job starts)
    avgCycleTimeMin: number;
    medianCycleTimeMin: number;
    p90CycleTimeMin: number;
    p90JobDurationMin: number;

    // Job duration (time to complete)
    avgJobDurationMin: number;
    medianJobDurationMin: number;

    // Metadata
    totalJobsAnalyzed: number;
    outliersExcluded: number;
}

// ----------------------------------------------------------------------
// NEW: Engineered Standards Configuration
// ----------------------------------------------------------------------

export type FlowClass = 'Standard' | 'Mass' | 'Put-Wall';

export interface MicroActivity {
    name: string;
    defaultSeconds: number;
    targetSeconds?: number; // New: Target Standard
    group?: string; // e.g. "Picking Init", "Common", "Standad Only"
    bucket: string; // The variable it sums up to, e.g. "Line Base", "Unit Variable"
}

export interface CalculationCard {
    id: string; // "picking_duration", "job_init"
    title: string;
    activities: MicroActivity[];
    variables: { name: string; value: number; targetValue?: number }[]; // Computed totals
}

export interface JobFlowConfig {
    acronym: string;
    fullName: string;
    flowClass: FlowClass;
}

export interface EngineeredStandardsConfig {
    jobFlows: JobFlowConfig[];
    cards: CalculationCard[];
}

export interface GlobalShiftParams {
    standardShiftDurationHours: number;
    breakThresholdSec: number;
    pickingTravelRatio: number; // 0.0 - 1.0
    pickingDirectRatio: number; // 0.0 - 1.0 (Must sum to 1.0 with travel)
    smoothingToleranceSec: number;
}


export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
    intraJobBuffer: 0, // Gap = Interruption (WMS is contiguous)
    jobTransitionBuffer: 0, // Gap = Interruption
    alertThreshold: 10,
    flowBucketInterval: 10,
    flowExcludeEmpty: true,
    flowCalculationMethod: 'interval',
    smoothingTolerance: 2, // User requested 2s default
    breakThreshold: 300,
    travelRatio: 0.70,
    utilizationCap: 5,

    // GLOBAL SHIFT PARAMS (Defaults)
    globalShiftParams: {
        standardShiftDurationHours: 8.0,
        breakThresholdSec: 300,
        pickingTravelRatio: 0.70,
        pickingDirectRatio: 0.30,
        smoothingToleranceSec: 2
    },

    // ENGINEERED STANDARDS (Defaults)
    engineeredStandards: {
        jobFlows: [
            { acronym: 'OBPP', fullName: 'Order Base Pick Pack', flowClass: 'Standard' },
            { acronym: 'SIBP', fullName: 'Single Item Batch Pick', flowClass: 'Standard' },
            { acronym: 'MICP', fullName: 'Multi Item Cluster Pick', flowClass: 'Standard' },
            { acronym: 'IIBP', fullName: 'Identical Item Batch Pick', flowClass: 'Mass' },
            { acronym: 'IOBP', fullName: 'Identical Order Batch Pick', flowClass: 'Mass' },
            { acronym: 'SICP', fullName: 'Single Item Cluster Pick', flowClass: 'Mass' },
            { acronym: 'PUTW', fullName: 'Put Wall Sort', flowClass: 'Put-Wall' }
        ],
        cards: [
            {
                id: 'job_init',
                title: 'Job Initialization (Inter-Job)',
                variables: [
                    { name: 'Picking Init', value: 250, targetValue: 250 },
                    { name: 'Sorting Init', value: 100, targetValue: 100 },
                    { name: 'Packing Init (Std)', value: 20, targetValue: 20 },
                    { name: 'Packing Init (Mass)', value: 50, targetValue: 50 }
                ],
                activities: [
                    { name: 'Cart Setup', defaultSeconds: 60, targetSeconds: 60, group: 'Picking Init', bucket: 'Picking Init' },
                    { name: 'Travel to Zone', defaultSeconds: 190, targetSeconds: 190, group: 'Picking Init', bucket: 'Picking Init' },
                    { name: 'Wall Setup/Login', defaultSeconds: 100, targetSeconds: 100, group: 'Sorting Init', bucket: 'Sorting Init' },
                    { name: 'Station Login', defaultSeconds: 15, targetSeconds: 15, group: 'Packing Init', bucket: 'Common Init' },
                    { name: 'Station Prep', defaultSeconds: 5, targetSeconds: 5, group: 'Packing Init', bucket: 'Common Init' },
                    { name: 'Batch Print', defaultSeconds: 30, targetSeconds: 30, group: 'Packing Init', bucket: 'Mass Flow Only' }
                ]
            },
            {
                id: 'picking_duration',
                title: 'Picking Duration (Direct Time)',
                variables: [
                    { name: 'Line Base', value: 8, targetValue: 8 },
                    { name: 'Unit Variable', value: 15, targetValue: 15 }
                ],
                activities: [
                    { name: 'Scan Location', defaultSeconds: 3, targetSeconds: 3, bucket: 'Line Base' },
                    { name: 'Scan Item', defaultSeconds: 3, targetSeconds: 3, bucket: 'Line Base' },
                    { name: 'Scan Tote', defaultSeconds: 2, targetSeconds: 2, bucket: 'Line Base' },
                    { name: 'Pick & Put Item', defaultSeconds: 10, targetSeconds: 10, bucket: 'Unit Variable' },
                    { name: 'Type Quantity', defaultSeconds: 5, targetSeconds: 5, bucket: 'Unit Variable' }
                ]
            },
            {
                id: 'picking_travel',
                title: 'Picking Travel (Travel Time)',
                variables: [
                    { name: 'Travel Proxy', value: 16, targetValue: 16 } // 1 + 15
                ],
                activities: [
                    { name: 'Step Cost', defaultSeconds: 1, targetSeconds: 1, bucket: 'Travel Proxy' },
                    { name: 'Avg Steps / Line', defaultSeconds: 15, targetSeconds: 15, bucket: 'Travel Proxy' }
                ]
            },
            {
                id: 'packing_duration',
                title: 'Packing Duration (Process Time)',
                variables: [
                    { name: 'Box Overhead (Std)', value: 25, targetValue: 25 },
                    { name: 'Box Overhead (Mass)', value: 10, targetValue: 10 },
                    { name: 'Item Handling (Std)', value: 15, targetValue: 15 },
                    { name: 'Item Handling (Mass)', value: 5, targetValue: 5 }
                ],
                activities: [
                    { name: 'Box Suggestion', defaultSeconds: 5, targetSeconds: 5, group: 'Box Overhead', bucket: 'Standard Only' },
                    { name: 'Rate Shopping', defaultSeconds: 5, targetSeconds: 5, group: 'Box Overhead', bucket: 'Standard Only' },
                    { name: 'Print Label', defaultSeconds: 5, targetSeconds: 5, group: 'Box Overhead', bucket: 'Standard Only' },
                    { name: 'Prepare Box', defaultSeconds: 1, targetSeconds: 1, group: 'Box Overhead', bucket: 'Common' },
                    { name: 'Close Box', defaultSeconds: 4, targetSeconds: 4, group: 'Box Overhead', bucket: 'Common' },
                    { name: 'Stick Label', defaultSeconds: 2, targetSeconds: 2, group: 'Box Overhead', bucket: 'Common' },
                    { name: 'Put Box', defaultSeconds: 3, targetSeconds: 3, group: 'Box Overhead', bucket: 'Common' },
                    { name: 'Scan Tote', defaultSeconds: 5, targetSeconds: 5, group: 'Item Handling', bucket: 'Standard Only' },
                    { name: 'Find Item', defaultSeconds: 5, targetSeconds: 5, group: 'Item Handling', bucket: 'Standard Only' },
                    { name: 'Scan Item', defaultSeconds: 3, targetSeconds: 3, group: 'Item Handling', bucket: 'Common' },
                    { name: 'Put Item', defaultSeconds: 2, targetSeconds: 2, group: 'Item Handling', bucket: 'Common' }
                ]
            },
            {
                id: 'sorting_duration',
                title: 'Sorting Duration (Put-Wall)',
                variables: [
                    { name: 'Unit Variable', value: 8, targetValue: 8 }
                ],
                activities: [
                    { name: 'Scan Item', defaultSeconds: 3, targetSeconds: 3, bucket: 'Unit Variable' },
                    { name: 'Put to Wall', defaultSeconds: 5, targetSeconds: 5, bucket: 'Unit Variable' }
                ]
            }
        ]
    }
};

export const DEFAULT_CONFIG = DEFAULT_BUFFER_CONFIG;



export interface EnrichedShiftRecord extends ShiftRecord {
    rawGap: number; // minutes
    netGap: number; // minutes
    gapType: 'INTRA_JOB' | 'TRANSITION' | 'FIRST_TASK' | 'OVERLAP' | 'IGNORED';
    isAnomaly: boolean;
    processTimeSec?: number; // GSPT
    travelTimeSec?: number; // GSPT
    interJobGapSec?: number; // Init/Finalize
}

export interface TelemetryLog {
    timestamp: Date;
    user: string;
    type: 'OVERLAP' | 'GAP_ANOMALY';
    message: string;
    details?: any;
}

export interface ProcessStats {
    uph: number;
    uphPure: number;
    uphHourlyFlow: number;
    productiveUPH: number; // NEW 3.1
    floorUPH: number; // NEW 3.2
    outputDensity: number; // NEW 3.3
    dynamicIntervalUPH: number; // NEW: 15-min bucket flow
    flowDetails?: FlowDetailData; // NEW: Detailed breakdown
    tph: number;
    utilization: number;
    totalVolume: number;
    totalActiveTime: number; // hours (Shift Span)
    directTime: number; // minutes
    distinctLocations: number;
    totalTasks: number;
    locationsPerUnit: number;
    avgTaskDuration: number;
    avgProcessTimeSec: number; // NEW
    avgTravelTimeSec: number; // NEW
}

export interface FlowDetailData {
    intervals: IntervalData[];
    allUsers: string[];
}

export interface IntervalData {
    intervalStart: Date;
    intervalEnd: Date;
    volume: number;
    activeUserCount: number;
    rate: number; // Annualized UPH for this interval
    users: Record<string, number>; // User -> Volume map
}

export interface AggregatedStats {
    // Global Stats (still needed for header/overview if any)
    uph: number;
    uphPure: number;
    uphHourlyFlow: number;
    productiveUPH: number; // NEW 3.1
    floorUPH: number; // NEW 3.2
    outputDensity: number; // NEW 3.3
    picking: ProcessStats;
    sorting: ProcessStats;
    packing: ProcessStats;
    tph: number;
    utilization: number;
    totalVolume: number;
    totalTimeOffTask: number; // minutes
    totalActiveTime: number; // hours (Direct + Indirect - Gaps?) No, usually (Finish - Start) sum?
    // Spec says: Utilization = (Sum of (Finish - Start) durations / Total Shift Span) * 100.
    // And UPH = Total Qty / Total Active Hours.
    // We need to clarify "Total Active Hours". Is it Shift Span or Working Time?
    // Spec says: "UPH: Total UPH / Total Active Hours."
    // Usually Active Hours = Sum(Task Duration) + Sum(Allowed Buffers).
    // Or just Sum(Task Duration)?
    // Let's stick to Sum(Finish - Start) for now as "Direct Time" and maybe add buffers for "Allowed Time".
    // I will track: directTime (minutes), allowedBufferTime (minutes), lostTime (minutes).
    directTime: number; // minutes
    allowedBufferTime: number; // minutes
    lostTime: number; // minutes
    distinctLocations: number; // Unique Job+Location count
    locationsPerUnit: number; // distinctLocations / totalVolume
}

export interface HealthStats {
    totalOrders: number;
    singleItemOrders: number;
    multiItemOrders: number;
    uniqueLocsVisited: number; // Same as distinctLocations (Job + Location)
    totalUniqueLocations: number; // Physical distinct locations
    totalUnits: number; // Same as totalVolume
    uniquePickers: number;
    uniquePackers: number;
    totalDistinctEmployees: number;
    crossTrainedEmployees: number; // Users who did both picking and packing
    avgPickDurationSec: number;
    avgPackDurationSec: number;
    avgJobTransitionMin: number;
    avgTravelTimeSec: number; // "Walking Speed" proxy (mean gap time)

    // Job-Level Statistics
    totalJobs: number;
    avgUnitsPerJob: number;
    avgSkusPerJob: number;
    avgLocationsPerJob: number;
    avgOrdersPerJob: number;
    avgTasksPerJob: number;

    // New Tables Data
    jobCodeStats: JobCodeStats[];
    jobTypeStats: JobTypeStats[];
    taskTypeStats: TaskTypeStats[];
    waveStats: WaveStats[]; // NEW
    taskDurationAudit?: any[]; // For now to avoid strict typing issues, or define proper type
}

export interface AdvancedMetrics {
    transitionFriction: number;
    pickToPackSyncMin: number;
    activeScanRatio: number;
    skuBatchability: number;
}

export interface JobCodeStats {
    jobCode: string;
    jobType: string;
    totalOrders: number;
    totalLocations: number; // Unique locations
    totalSkus: number;      // Unique SKUs
    totalUnits: number;
    isAI: boolean;
}

export interface JobTypeStats {
    jobType: string;
    avgOrdersPerJob: number;
    avgUnitsPerJob: number;
    avgSkusPerJob: number;
    totalJobs: number;
}

export interface TaskTypeStats {
    taskType: string;
    avgOrdersPerJob: number;
    avgUnitsPerJob: number;
    avgSkusPerJob: number;
}

export interface WaveStats {
    waveCode: string;
    totalJobs: number;
    avgOrders: number;
    avgUnits: number;
}

export interface IngestionSummary {
    totalRows: number;
    validRows: number;
    errorRows: number;
    dateRange: { start: Date; end: Date } | null;
    uniqueUsers: number;
    warehouses: string[];
    clients: string[];
    errors: string[]; // Top 5-10 errors
    warnings: string[]; // "Suspicious" data (e.g. 0 qty)
    assumptions: string[]; // Logic assumptions log
}

export interface WorkerResult {
    type: 'SUCCESS' | 'ERROR';
    data?: EnrichedShiftRecord[]; // We might parse simply ShiftRecord first
    taskObjects?: TaskObject[]; // NEW
    activityObjects?: ActivityObject[]; // NEW
    summary?: IngestionSummary;
    message?: string;
}

// ----------------------------------------------------------------------
// NEW: Warehouse Productivity Logic Types
// ----------------------------------------------------------------------

export interface TaskObject {
    User: string;
    Client: string;
    SKU: string;
    Location: string;
    Zone: string;
    Quantity: number;
    JobCode: string;
    OrderCode: string; // NEW: For unique order counting
    TaskType: string;
    Start: Date;
    Finish: Date;

    // Core Metrics
    ProductiveDurationSec: number;
    TaskDirectTimeSec: number;
    TaskTravelTimeSec: number;
    UnproductiveDurationSec: number;
    TotalUnits: number;

    // Process Metadata
    IsBatchNormalized: boolean;
    OriginalDurationSec: number;
    BatchSize: number;
    IsSimultaneous?: boolean;
}

export interface ActivityObject {
    id: string; // Unique ID for UI/Grid keys
    User: string;
    Activity: string; // "Pick|Sort", "No Activity", "Break"
    JobCode: string | null;
    Start: Date;
    Finish: Date;

    // Aggregates
    ProductiveDurationSec: number;
    TaskDirectTimeSec: number;
    TaskTravelTimeSec: number;
    UnproductiveDurationSec: number;

    NofOrders: number;
    NofTasks: number;
    NofUnits: number;

    AvgTaskDurationSec: number;
    AvgTravelDurationSec: number;
}

// ----------------------------------------------------------------------
// User Performance Types
// ----------------------------------------------------------------------

export interface UserPerformanceStats {
    user: string;
    totalVolume: number;
    totalTimeHours?: number; // mapped to totalShiftSpan
    uph: number;
    activeTimeHours?: number; // mapped to directTime
    utilization: number;
    shiftStart?: Date;
    shiftEnd?: Date;
    rank: number;
    // Usage in analysis.ts
    totalShiftSpan: number;
    directTime: number;

}

export interface AnalysisResult {
    records: EnrichedShiftRecord[];
    stats: AggregatedStats;
    health: HealthStats;
    roleDiagnostics?: {
        pickers: { user: string; reason: string }[];
        packers: { user: string; reason: string }[];
    };
    telemetry: TelemetryLog[];
    userPerformance: UserPerformanceStats[];
    jobTimingMetrics: JobTimingMetrics;
    advanced: AdvancedMetrics; // Added based on usage
}
