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
}

export const DEFAULT_CONFIG: BufferConfig = {
    intraJobBuffer: 2,
    jobTransitionBuffer: 8,
    alertThreshold: 10,
};

export interface EnrichedShiftRecord extends ShiftRecord {
    rawGap: number; // minutes
    netGap: number; // minutes
    gapType: 'INTRA_JOB' | 'TRANSITION' | 'FIRST_TASK' | 'OVERLAP' | 'IGNORED';
    isAnomaly: boolean;
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
    tph: number;
    utilization: number;
    totalVolume: number;
    totalActiveTime: number; // hours (Shift Span)
    directTime: number; // minutes
    distinctLocations: number;
    locationsPerUnit: number;
}

export interface AggregatedStats {
    // Global Stats (still needed for header/overview if any)
    uph: number;
    uphPure: number;
    uphHourlyFlow: number;
    picking: ProcessStats;
    packing: ProcessStats;
    tph: number;
    utilization: number;
    totalVolume: number;
    totalTimeOffTask: number; // minutes
    totalActiveTime: number; // hours (Direct + Indirect - Gaps?) No, usually (Finish - Start) sum?
    // Spec says: Utilization = (Sum of (Finish - Start) durations / Total Shift Span) * 100.
    // And UPH = Total Qty / Total Active Hours.
    // We need to clarify "Total Active Hours". Is it Shift Span or Working Time?
    // Spec says: "UPH: Total Qty / Total Active Hours."
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

    // New Tables Data
    jobCodeStats: JobCodeStats[];
    jobTypeStats: JobTypeStats[];
    taskTypeStats: TaskTypeStats[];
    waveStats: WaveStats[]; // NEW
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
    summary?: IngestionSummary;
    message?: string;
}
