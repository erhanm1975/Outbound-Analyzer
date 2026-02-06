import React from 'react';

export const TooltipContainer = ({ title, children, formula }: { title: string, children: React.ReactNode, formula?: string }) => (
    <div className="text-left space-y-2">
        <div>
            <strong className="text-blue-200 block mb-1">{title}</strong>
            <div className="text-slate-300 text-[10px] leading-relaxed space-y-1">{children}</div>
        </div>
        {formula && (
            <div className="bg-black/20 p-2 rounded border border-white/10 mt-2">
                <span className="text-emerald-300 font-mono text-[9px] block">
                    <span className="text-emerald-500 font-bold">Formula:</span> {formula}
                </span>
            </div>
        )}
    </div>
);

export const METRIC_TOOLTIPS = {
    // HERO METRICS
    PICKING_UPH_OCCUPANCY: (
        <TooltipContainer title="Picking Speed (Occupancy)" formula="Total Volume / Σ(User Shift Spans)">
            <p>Total Units picked divided by the Sum of User Shift Hours.</p>
            <ul className="list-disc pl-3 text-slate-400 mt-1">
                <li><strong>Units:</strong> Sum of 'Quantity' for all tasks.</li>
                <li><strong>Hours:</strong> Sum of each user's floor time (Last Scan - First Scan), including gaps/breaks.</li>
            </ul>
        </TooltipContainer>
    ),

    PICKING_UTILIZATION: (
        <TooltipContainer title="Picker Efficiency" formula="(Active Interval Time / Total Shift Span) * 100">
            <p>Percentage of shift time spent on active tasks vs idle/gaps.</p>
            <ul className="list-disc pl-3 text-slate-400 mt-1">
                <li><strong>Active:</strong> Merged duration of overlapping tasks (Active Wall-Clock).</li>
                <li><strong>Total:</strong> Sum of User Shift Hours.</li>
                <li>Capped at 100% to reflect true saturation.</li>
            </ul>
        </TooltipContainer>
    ),

    PACKING_UPH_OCCUPANCY: (
        <TooltipContainer title="Packing Speed (Occupancy)" formula="Total Volume / Σ(User Shift Spans)">
            <p>Total Units packed divided by Total Shift Hours.</p>
        </TooltipContainer>
    ),

    PACKING_UTILIZATION: (
        <TooltipContainer title="Packer Efficiency" formula="(Active Interval Time / Total Shift Span) * 100">
            <p>Percentage of shift time spent actively packing.</p>
            <p className="text-slate-400 italic">Merges overlapping tasks to avoid &gt;100% errors.</p>
        </TooltipContainer>
    ),

    // DENSITY
    VISIT_DENSITY_UNIT: (
        <TooltipContainer title="Visit Density (Per Unit)" formula="Distinct Locs / Total Units">
            <p>How many unique locations are visited per unit picked.</p>
            <p className="text-slate-400">Lower is better (indicates dense picking).</p>
        </TooltipContainer>
    ),

    VISIT_DENSITY_LINE: (
        <TooltipContainer title="Visit Density (Per Line)" formula="Distinct Locs / Total Tasks">
            <p>How many unique locations are visited per task line.</p>
            <p className="text-slate-400">1.0 = Single Pick per Visit.<br />Lower = Multi-Pick Batching.</p>
        </TooltipContainer>
    ),

    // TIER 2
    TPH: (
        <TooltipContainer title="Throughput (Tasks/Hr)" formula="Total Tasks / Active Hours">
            <p>Speed of Task Execution relative to floor hours.</p>
        </TooltipContainer>
    ),

    // VELOCITY
    UPH_PURE_ACTIVE: (
        <TooltipContainer title="Pure Active UPH" formula="Total Units / Sum(Task Durations)">
            <p>Theoretical Max Speed excluding ALL gaps and travel.</p>
            <p className="text-orange-300">"Speed Limit" of the process.</p>
        </TooltipContainer>
    ),

    UPH_HOURLY_AVG: (
        <TooltipContainer title="Hourly Flow Capacity" formula="Avg(Volume per Active Hour)">
            <p>Average throughput capability per hour of activity.</p>
        </TooltipContainer>
    ),

    DYNAMIC_FLOW_UPH: (
        <TooltipContainer title="Dynamic Flow Rate" formula="Avg(Units / Active Users) per 10m">
            <p>Flow-based calculation that normalizes for lunch/break dips.</p>
        </TooltipContainer>
    ),

    // TASK FLOW
    FLOW_INTER_JOB: (
        <TooltipContainer title="Inter-Job Gap">
            <p>Average time elapsed between finishing one job and starting the next.</p>
        </TooltipContainer>
    ),
    FLOW_TRAVEL: (
        <TooltipContainer title="Travel Time">
            <p>Estimated movement time between locations.</p>
            <p className="text-slate-500 italic">Derived via P10 Heuristic.</p>
        </TooltipContainer>
    ),
    FLOW_PICKING: (
        <TooltipContainer title="Picking Execution">
            <p>Time spent physically performing the pick at the bin.</p>
        </TooltipContainer>
    ),
    FLOW_SORTING: (
        <TooltipContainer title="Sorting Process">
            <p>Time spent sorting items (Batch Normalized).</p>
        </TooltipContainer>
    ),
    FLOW_PACKING: (
        <TooltipContainer title="Packing Process">
            <p>Time spent packing the order.</p>
        </TooltipContainer>
    ),

    // WORKLOAD
    WORKLOAD_TOTAL_JOBS: (
        <TooltipContainer title="Job Volume">
            <p>Total number of discrete Jobs (Orders/Batches).</p>
        </TooltipContainer>
    ),
    WORKLOAD_UNITS_JOB: (
        <TooltipContainer title="Job Size" formula="Total Units / Total Jobs">
            <p>Average quantity of units per job.</p>
            <p className="text-emerald-300">Larger jobs = Better efficiency.</p>
        </TooltipContainer>
    ),
    WORKLOAD_SKUS_JOB: (
        <TooltipContainer title="Job Complexity">
            <p>Average distinct SKUs per job.</p>
            <p className="text-slate-400">High SKUs + Low Units = High Complexity Mix.</p>
        </TooltipContainer>
    ),
    WORKLOAD_LOCS_JOB: (
        <TooltipContainer title="Job Density">
            <p>Average distinct locations visited per job.</p>
        </TooltipContainer>
    ),
    WORKLOAD_ORDERS_JOB: (
        <TooltipContainer title="Batch Size">
            <p>Average number of customer orders combined into a single job.</p>
        </TooltipContainer>
    ),
    WORKLOAD_TASKS_JOB: (
        <TooltipContainer title="Work Content">
            <p>Average tasks (lines) required to complete a job.</p>
        </TooltipContainer>
    ),

    // --- ADVANCED METRICS ---
    TRANSITION_FRICTION: (
        <TooltipContainer title="Transition Friction" formula="Active Task Time / Total Job Duration">
            <p>Measures the efficiency of the job execution.</p>
            <p>Values approaching <strong>1.0</strong> indicate minimal travel/setup waste.</p>
        </TooltipContainer>
    ),
    PICK_TO_PACK_SYNC: (
        <TooltipContainer title="Pick-to-Pack Sync" formula="Min Pack Start - Max Pick Finish">
            <p>The time gap between the end of picking and the start of packing for a wave.</p>
            <p className="text-slate-400">Lower is better. Negative values indicate optimal overlapping flow.</p>
        </TooltipContainer>
    ),
    ACTIVE_SCAN_RATIO: (
        <TooltipContainer title="Active Scan Ratio" formula="Total Task Duration / Total Shift Span">
            <p>Percentage of shift time spent on verifiable system tasks.</p>
            <p>Higher is better (indicates high engagement).</p>
        </TooltipContainer>
    ),
    SKU_BATCHABILITY: (
        <TooltipContainer title="SKU Batchability" formula="Total Units / Distinct SKUs">
            <p>Density metric indicating how many units are picked per unique SKU location visit.</p>
            <p>Higher values indicate easier-to-batch profiles.</p>
        </TooltipContainer>
    ),
    INTER_JOB_GAP: (
        <TooltipContainer title="Inter-Job Gap">
            <p>The average interruption or downtime between completing one job and starting the next.</p>
            <p className="text-slate-400">Lower is better (less downtime).</p>
        </TooltipContainer>
    ),
    JOB_CYCLE_TIME: (
        <TooltipContainer title="Job Cycle Time">
            <p>The cadence or rhythm of job induction (Time between Start Job A and Start Job B).</p>
            <p>Lower usually indicates a faster, steadier flow.</p>
        </TooltipContainer>
    ),
    JOB_DURATION: (
        <TooltipContainer title="Job Duration">
            <p>The wall-clock time required to complete a single job (Start to Finish).</p>
            <p>Pure execution time.</p>
        </TooltipContainer>
    ),

    // --- AUDIT METRICS ---
    AUDIT_P10: (
        <TooltipContainer title="P10 Baseline (Process Time)">
            <p>The duration of the fastest 10% of tasks.</p>
            <p className="text-slate-400 mt-1">Represents pure process time with minimal travel friction.</p>
        </TooltipContainer>
    ),
    AUDIT_AVG: (
        <TooltipContainer title="Average Duration">
            <p>The arithmetic mean of all task durations.</p>
            <p className="text-slate-400 mt-1">Heavily influenced by long travel times or outliers.</p>
        </TooltipContainer>
    ),
    AUDIT_TRAVEL: (
        <TooltipContainer title="Calculated Travel Time" formula="Average - P10 Baseline">
            <p>The estimated portion of task duration attributed to travel.</p>
            <p className="text-slate-400 mt-1">Derived by subtracting the pure process time (P10) from the average.</p>
        </TooltipContainer>
    ),
    AUDIT_MEDIAN: (
        <TooltipContainer title="Median Duration">
            <p>The 50th percentile task duration.</p>
            <p className="text-slate-400 mt-1">A robust measure of central tendency, less affected by outliers than the average.</p>
        </TooltipContainer>
    ),

    // --- SHIFT HEALTH METRICS ---
    SHIFT_TOTAL_UNITS: (
        <TooltipContainer title="Total Units">
            <p>The sum of 'Quantity' for all valid records in the dataset.</p>
        </TooltipContainer>
    ),
    SHIFT_DISTINCT_USERS: (
        <TooltipContainer title="Distinct Users">
            <p>The count of unique User IDs identified in the shift.</p>
            <p className="text-slate-400">Includes both Pickers and Packers.</p>
        </TooltipContainer>
    ),
    SHIFT_UNIQUE_VISITS: (
        <TooltipContainer title="Unique Visits">
            <p>The total number of location visits.</p>
            <p className="text-slate-400">Calculated as the sum of distinct locations visited per job.</p>
        </TooltipContainer>
    ),
    SHIFT_PHYSICAL_FOOTPRINT: (
        <TooltipContainer title="Physical Footprint">
            <p>The total number of unique location addresses accessed during the shift.</p>
            <p className="text-slate-400">Indicates the spatial spread of the workload.</p>
        </TooltipContainer>
    ),

    // --- GRID COLUMNS ---

    // JOB BREAKDOWN
    COL_JOB_CODE: (
        <TooltipContainer title="Job Code">
            <p>Unique identifier for the job batch or wave.</p>
        </TooltipContainer>
    ),
    COL_JOB_TYPE: (
        <TooltipContainer title="Job Type">
            <p>Functional categorization (e.g., Picking, Packing, Replenishment).</p>
        </TooltipContainer>
    ),
    COL_SOURCE: (
        <TooltipContainer title="Source Intelligence">
            <p>Indicates whether the job was planned by AI (Optimization Engine) or manually created.</p>
        </TooltipContainer>
    ),
    COL_ORDERS: (
        <TooltipContainer title="Order Count">
            <p>Number of discrete customer orders contained within this job.</p>
        </TooltipContainer>
    ),
    COL_LOCATIONS: (
        <TooltipContainer title="Unique Locations">
            <p>Count of distinct warehouse locations visited during this job.</p>
        </TooltipContainer>
    ),
    COL_SKUS: (
        <TooltipContainer title="Unique SKUs">
            <p>Count of distinct items (SKUs) handled in this job.</p>
        </TooltipContainer>
    ),
    COL_UNITS: (
        <TooltipContainer title="Total Units">
            <p>Sum of all item quantities processed in this job.</p>
        </TooltipContainer>
    ),

    // USER PERFORMANCE
    COL_RANK: (
        <TooltipContainer title="Performance Rank">
            <p>Relative ranking based on UPH (Occupancy) for the current filtered period.</p>
        </TooltipContainer>
    ),
    COL_USER: (
        <TooltipContainer title="Associate">
            <p>Name or ID of the warehouse associate.</p>
        </TooltipContainer>
    ),
    COL_UPH_OCC: (
        <TooltipContainer title="UPH (Occupancy)" formula="Total Volume / Shift Span">
            <p>Units Per Hour calculated against total floor time (First Scan to Last Scan).</p>
            <p className="text-slate-400 italic">Includes all gaps, breaks, and idle time.</p>
        </TooltipContainer>
    ),
    COL_VOLUME: (
        <TooltipContainer title="Total Volume">
            <p>Total units processed by the user.</p>
        </TooltipContainer>
    ),
    COL_SPAN: (
        <TooltipContainer title="Shift Span">
            <p>Wall-clock time elapsed between the user's first and last activity.</p>
        </TooltipContainer>
    ),
    COL_DIRECT_TIME: (
        <TooltipContainer title="Active Time">
            <p>Sum of durations where the user was actively performing tasks.</p>
            <p className="text-slate-400">Excludes gaps between tasks.</p>
        </TooltipContainer>
    ),
    COL_UTIL_PERCENT: (
        <TooltipContainer title="Utilization %" formula="(Active Time / Shift Span) * 100">
            <p>Percentage of time spent on active work vs. idle/gap time.</p>
        </TooltipContainer>
    ),

    // ACTIVITY MATRIX
    COL_MATRIX_USER: (
        <TooltipContainer title="Active Users">
            <p>Users who had activity during the shift.</p>
        </TooltipContainer>
    ),
    COL_MATRIX_HOUR: (
        <TooltipContainer title="Hour Block">
            <p>Activity aggregated by hour of day (00:00 - 23:00).</p>
        </TooltipContainer>
    ),
    COL_MATRIX_TOTAL: (
        <TooltipContainer title="Shift Total">
            <p>Total activity (Tasks or Volume) for the user across the entire shift.</p>
        </TooltipContainer>
    )
};
