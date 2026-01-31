import type { ShiftAnalysis } from './analysis';
import type { IngestionSummary as IngestionSummaryType } from '../types';

export function generateAIContext(
    analysis: ShiftAnalysis,
    filename: string,
    ingestionSummary?: IngestionSummaryType | null,
    benchmarkAnalysis?: ShiftAnalysis | null,
    benchmarkFilename?: string
): string {
    const { stats, health, records } = analysis;
    const timestamp = new Date().toISOString();

    const dashboardContext = {
        picking: {
            uph: stats.picking.uph,
            uphPure: stats.picking.uphPure,
            uphHourlyFlow: stats.picking.uphHourlyFlow,
            totalVolume: stats.picking.totalVolume,
            totalActiveTime: stats.picking.totalActiveTime.toFixed(2),
            distinctLocations: stats.picking.distinctLocations,
            locationsPerUnit: stats.picking.locationsPerUnit
        },
        packing: {
            uph: stats.packing.uph,
            uphPure: stats.packing.uphPure,
            uphHourlyFlow: stats.packing.uphHourlyFlow,
            totalVolume: stats.packing.totalVolume,
            utilization: stats.packing.utilization,
            totalActiveTime: stats.packing.totalActiveTime.toFixed(2)
        }
    };

    const healthContext = {
        volume: {
            totalUnits: health.totalUnits,
            totalOrders: health.totalOrders,
            singleItemOrders: health.singleItemOrders,
            multiItemOrders: health.multiItemOrders
        },
        workforce: {
            distinctEmployees: health.totalDistinctEmployees,
            pickers: health.uniquePickers,
            packers: health.uniquePackers,
            crossTrained: health.crossTrainedEmployees
        },
        processes: {
            avgPickSec: health.avgPickDurationSec,
            avgPackSec: health.avgPackDurationSec,
            avgTravelSec: health.avgTravelTimeSec
        }
    };

    const ingestionContext = ingestionSummary ? {
        totalRows: ingestionSummary.totalRows,
        validRows: ingestionSummary.validRows,
        errorRows: ingestionSummary.errorRows,
        warnings: ingestionSummary.warnings.length,
        errors: ingestionSummary.errors.length
    } : null;

    // Calculate anomalies from records
    const highDurationCount = records.filter(r => r.isAnomaly).length;
    const rapidFireCount = records.filter(r => (r.Finish.getTime() - r.Start.getTime()) < 2000).length;
    const gapCount = records.filter(r => r.rawGap > 5).length;

    const anomalyContext = {
        highDurationCount,
        rapidFireCount,
        gapCount
    };

    // --- Benchmark Logic ---
    let benchmarkSection = '';
    if (benchmarkAnalysis && benchmarkFilename) {
        const bStats = benchmarkAnalysis.stats;
        const bHealth = benchmarkAnalysis.health;
        const bRecords = benchmarkAnalysis.records;

        benchmarkSection = `
## 5. BENCHMARK COMPARISON
**Benchmark Source**: ${benchmarkFilename}

### Benchmark KPI (Picking)
- UPH: ${bStats.picking.uph}
- Flow UPH (Hourly Average): ${bStats.picking.uphHourlyFlow}
- Total Volume: ${bStats.picking.totalVolume}
- Active Hours: ${bStats.picking.totalActiveTime}

### Benchmark KPI (Packing)
- UPH: ${bStats.packing.uph}
- Flow UPH (Hourly Average): ${bStats.packing.uphHourlyFlow}
- Total Volume: ${bStats.packing.totalVolume}
- Active Hours: ${bStats.packing.totalActiveTime}
- Utilization: ${bStats.packing.utilization}%

### Benchmark Input Validation (Health)
- Total Units: ${bHealth.totalUnits}
- Total Orders: ${bHealth.totalOrders} (S:${bHealth.singleItemOrders} / M:${bHealth.multiItemOrders})
- Workforce: ${bHealth.totalDistinctEmployees} (Pick:${bHealth.uniquePickers} / Pack:${bHealth.uniquePackers})
- Avg Pick Time: ${bHealth.avgPickDurationSec.toFixed(1)}s
- Avg Pack Time: ${bHealth.avgPackDurationSec.toFixed(1)}s
- Anomalies: HighDuration=${bRecords.filter(r => r.isAnomaly).length}, Gaps=${bRecords.filter(r => r.rawGap > 5).length}
        `.trim();
    }

    return `
# JOB ANALYZER CONTEXT EXPORT
# Generated: ${timestamp}
# Primary Source: ${filename}

## 1. DASHBOARD METRICS (KPIs)

### Picking Operations
- UPH (Occupancy): ${dashboardContext.picking.uph}
- Flow UPH (Hourly Average): ${dashboardContext.picking.uphHourlyFlow}
- Total Volume: ${dashboardContext.picking.totalVolume}
- Active Hours: ${dashboardContext.picking.totalActiveTime}
- Density (Locs/Unit): ${dashboardContext.picking.locationsPerUnit}

### Packing Operations
- UPH (Occupancy): ${dashboardContext.packing.uph}
- Flow UPH (Hourly Average): ${dashboardContext.packing.uphHourlyFlow}
- Total Volume: ${dashboardContext.packing.totalVolume}
- Active Hours: ${dashboardContext.packing.totalActiveTime}
- Utilization: ${dashboardContext.packing.utilization}%

## 2. INPUT VALIDATION (Data Health)

### Volume Profile
- Total Units: ${healthContext.volume.totalUnits}
- Total Orders: ${healthContext.volume.totalOrders}
- Order Split: ${healthContext.volume.singleItemOrders} Single / ${healthContext.volume.multiItemOrders} Multi

### Workforce composition
- Total Staff: ${healthContext.workforce.distinctEmployees}
- Pickers: ${healthContext.workforce.pickers}
- Packers: ${healthContext.workforce.packers}
- Cross-Trained: ${healthContext.workforce.crossTrained}

### Process Timings (Avg)
- Pick Task: ${healthContext.processes.avgPickSec.toFixed(1)}s
- Pack Task: ${healthContext.processes.avgPackSec.toFixed(1)}s
- Travel/Gap: ${healthContext.processes.avgTravelSec.toFixed(1)}s

${ingestionContext ? `
## 3. FILE INGESTION SUMMARY
- Total Rows: ${ingestionContext.totalRows}
- Validated: ${ingestionContext.validRows}
- Skipped/Error: ${ingestionContext.errorRows}
- Warnings: ${ingestionContext.warnings}
` : ''}

## 4. ANOMALIES DETECTED
- Long Duration Tasks: ${anomalyContext.highDurationCount}
- Rapid Fire Tasks: ${anomalyContext.rapidFireCount}
- Significant Gaps: ${anomalyContext.gapCount}

${benchmarkSection}

---
END OF CONTEXT
`.trim();
}
