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

// Rich Tooltip Component (Based on Forensic OS Design)
export const RichTooltipContainer = ({
    title,
    description,
    includes,
    excludes,
    formula
}: {
    title: string,
    description: string,
    includes?: string[],
    excludes?: string[],
    formula?: string
}) => (
    <div className="text-left w-64">
        {/* Header */}
        <div className="mb-3 border-b border-slate-700/50 pb-2">
            <h4 className="text-sm font-bold text-white leading-tight">{title}</h4>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            {description}
        </p>

        {/* Includes / Excludes Section */}
        {(includes || excludes) && (
            <div className="space-y-2 mb-3 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                {includes && includes.length > 0 && (
                    <div className="flex gap-2 items-start">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5 min-w-[50px]">Includes:</span>
                        <div className="text-[10px] text-slate-300 leading-tight">
                            {includes.join(", ")}
                        </div>
                    </div>
                )}
                {excludes && excludes.length > 0 && (
                    <div className="flex gap-2 items-start">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mt-0.5 min-w-[50px]">Excludes:</span>
                        <div className="text-[10px] text-slate-300 leading-tight">
                            {excludes.join(", ")}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Formula */}
        {formula && (
            <div className="bg-[#0B1120] p-2.5 rounded border border-blue-900/30 font-mono">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-widest">Formula</span>
                </div>
                <div className="text-[10px] text-blue-300 break-words leading-relaxed">
                    {formula}
                </div>
            </div>
        )}
    </div>
);

export const METRIC_TOOLTIPS = {
    // HERO METRICS
    PRODUCTIVE_UPH: (
        <RichTooltipContainer
            title="Productive Picked UPH"
            description="Throughput calculation measuring speed during active working periods only."
            includes={["Active Picking Time", "Travel between picks", "Short handling gaps (< 5m)"]}
            excludes={["Breaks", "Lunch", "Long delays (> 5m)", "Meeting time"]}
            formula="Total Units ÷ (Active Time - Breaks)"
        />
    ),

    FLOOR_UPH: (
        <RichTooltipContainer
            title="Floor Picked UPH"
            description="Throughput calculation measuring speed over the entire presence on the floor."
            includes={["Active Picking", "Travel", "All Breaks", "All Delays", "Idle Time"]}
            formula="Total Units ÷ (Last Task Finish - First Task Start)"
        />
    ),

    OUTPUT_DENSITY: (
        <RichTooltipContainer
            title="Pick Density"
            description="Measure of volumetric efficiency per stop. High density indicates effective slotting and batching."
            formula="Total Units ÷ Unique Locations Visited"
        />
    ),

    PICKING_UPH_OCCUPANCY: (
        <RichTooltipContainer
            title="Picking Speed (Occupancy)"
            description="Total Units picked divided by the Sum of User Shift Hours."
            includes={["All Paid Hours"]}
            formula="Total Volume ÷ Σ(User Shift Spans)"
        />
    ),

    PICKING_UTILIZATION: (
        <RichTooltipContainer
            title="Picker Efficiency"
            description="Percentage of shift time spent on active tasks vs idle/gaps."
            includes={["Active Wall-Clock Time"]}
            excludes={["Idle Gaps"]}
            formula="(Active Interval Time / Total Shift Span) * 100"
        />
    ),

    PACKING_UPH_OCCUPANCY: (
        <RichTooltipContainer
            title="Packing Speed (Occupancy)"
            description="Total Units packed divided by Total Shift Hours."
            formula="Total Volume ÷ Σ(User Shift Spans)"
        />
    ),

    PACKING_UTILIZATION: (
        <RichTooltipContainer
            title="Packer Efficiency"
            description="Percentage of shift time spent actively packing."
            formula="(Active Interval Time / Total Shift Span) * 100"
        />
    ),

    // DENSITY
    VISIT_DENSITY_UNIT: (
        <RichTooltipContainer
            title="Visit Density (Per Unit)"
            description="How many unique locations are visited per unit picked. Lower is better."
            formula="Distinct Locs ÷ Total Units"
        />
    ),

    VISIT_DENSITY_LINE: (
        <RichTooltipContainer
            title="Visit Density (Per Line)"
            description="How many unique locations are visited per task line."
            formula="Distinct Locs ÷ Total Tasks"
        />
    ),

    // TIER 2
    TPH: (
        <RichTooltipContainer
            title="Throughput (Tasks/Hr)"
            description="Speed of Task Execution relative to floor hours."
            formula="Total Tasks ÷ Active Hours"
        />
    ),

    // VELOCITY
    UPH_PURE_ACTIVE: (
        <RichTooltipContainer
            title="Pure Active UPH"
            description="Theoretical Max Speed excluding ALL gaps and travel. The 'Speed Limit' of the process."
            formula="Total Units ÷ Sum(Task Durations)"
        />
    ),

    UPH_HOURLY_AVG: (
        <RichTooltipContainer
            title="Hourly Flow Capacity"
            description="Average throughput capability per hour of activity."
            formula="Avg(Volume per Active Hour)"
        />
    ),

    DYNAMIC_FLOW_UPH: (
        <RichTooltipContainer
            title="Dynamic Flow Rate"
            description="Flow-based calculation that normalizes for lunch/break dips."
            formula="Avg(Units / Active Users) per 10m"
        />
    ),

    // TASK FLOW
    FLOW_INTER_JOB: (
        <RichTooltipContainer
            title="Inter-Job Gap"
            description="Average time elapsed between finishing one job and starting the next."
        />
    ),
    FLOW_TRAVEL: (
        <RichTooltipContainer
            title="Travel Time"
            description="Estimated movement time between locations. Derived via P10 Heuristic."
        />
    ),
    FLOW_PICKING: (
        <RichTooltipContainer
            title="Picking Execution"
            description="Time spent physically performing the pick at the bin."
        />
    ),
    FLOW_SORTING: (
        <RichTooltipContainer
            title="Sorting Process"
            description="Time spent sorting items (Batch Normalized)."
        />
    ),
    FLOW_PACKING: (
        <RichTooltipContainer
            title="Packing Process"
            description="Time spent packing the order."
        />
    ),

    // WORKLOAD
    WORKLOAD_TOTAL_JOBS: (
        <RichTooltipContainer
            title="Job Volume"
            description="Total number of discrete Jobs (Orders/Batches)."
        />
    ),
    WORKLOAD_UNITS_JOB: (
        <RichTooltipContainer
            title="Job Size"
            description="Average quantity of units per job. Larger jobs = Better efficiency."
            formula="Total Units ÷ Total Jobs"
        />
    ),
    WORKLOAD_SKUS_JOB: (
        <RichTooltipContainer
            title="Job Complexity"
            description="Average distinct SKUs per job. High SKUs + Low Units = High Complexity Mix."
        />
    ),
    WORKLOAD_LOCS_JOB: (
        <RichTooltipContainer
            title="Job Density"
            description="Average distinct locations visited per job."
        />
    ),
    WORKLOAD_ORDERS_JOB: (
        <RichTooltipContainer
            title="Batch Size"
            description="Average number of customer orders combined into a single job."
        />
    ),
    WORKLOAD_TASKS_JOB: (
        <RichTooltipContainer
            title="Work Content"
            description="Average tasks (lines) required to complete a job."
        />
    ),

    // --- ADVANCED METRICS ---
    TRANSITION_FRICTION: (
        <RichTooltipContainer
            title="Transition Friction"
            description="Measures the efficiency of the job execution. Values approaching 1.0 indicate minimal travel/setup waste."
            formula="Active Task Time ÷ Total Job Duration"
        />
    ),
    PICK_TO_PACK_SYNC: (
        <RichTooltipContainer
            title="Pick-to-Pack Sync"
            description="The time gap between the end of picking and the start of packing for a wave."
            formula="Min Pack Start - Max Pick Finish"
        />
    ),
    ACTIVE_SCAN_RATIO: (
        <RichTooltipContainer
            title="Active Scan Ratio"
            description="Percentage of shift time spent on verifiable system tasks. Higher is better."
            formula="Total Task Duration ÷ Total Shift Span"
        />
    ),
    SKU_BATCHABILITY: (
        <RichTooltipContainer
            title="SKU Batchability"
            description="Density metric indicating how many units are picked per unique SKU location visit."
            formula="Total Units ÷ Distinct SKUs"
        />
    ),
    INTER_JOB_GAP: (
        <RichTooltipContainer
            title="Inter-Job Gap"
            description="The average interruption or downtime between completing one job and starting the next."
        />
    ),
    JOB_CYCLE_TIME: (
        <RichTooltipContainer
            title="Job Cycle Time"
            description="The cadence or rhythm of job induction (Time between Start Job A and Start Job B)."
        />
    ),
    JOB_DURATION: (
        <RichTooltipContainer
            title="Job Duration"
            description="The wall-clock time required to complete a single job (Start to Finish)."
        />
    ),

    // --- AUDIT METRICS ---
    AUDIT_P10: (
        <RichTooltipContainer
            title="P10 Baseline (Process Time)"
            description="The duration of the fastest 10% of tasks. Represents pure process time with minimal travel friction."
        />
    ),
    AUDIT_AVG: (
        <RichTooltipContainer
            title="Average Duration"
            description="The arithmetic mean of all task durations. Heavily influenced by long travel times or outliers."
        />
    ),
    AUDIT_TRAVEL: (
        <RichTooltipContainer
            title="Calculated Travel Time"
            description="The estimated portion of task duration attributed to travel."
            formula="Average - P10 Baseline"
        />
    ),
    AUDIT_MEDIAN: (
        <RichTooltipContainer
            title="Median Duration"
            description="The 50th percentile task duration. A robust measure of central tendency."
        />
    ),

    // --- SHIFT HEALTH METRICS ---
    SHIFT_TOTAL_UNITS: (
        <RichTooltipContainer title="Total Units" description="The sum of 'Quantity' for all valid records in the dataset." />
    ),
    SHIFT_DISTINCT_USERS: (
        <RichTooltipContainer
            title="Distinct Users"
            description="The count of unique User IDs identified in the shift (Pickers and Packers)."
        />
    ),
    SHIFT_UNIQUE_VISITS: (
        <RichTooltipContainer
            title="Unique Visits"
            description="The total number of location visits (sum of distinct locations visited per job)."
        />
    ),
    SHIFT_PHYSICAL_FOOTPRINT: (
        <RichTooltipContainer
            title="Physical Footprint"
            description="The total number of unique location addresses accessed during the shift."
        />
    ),

    // --- GRID COLUMNS ---
    COL_JOB_CODE: <RichTooltipContainer title="Job Code" description="Unique identifier for the job batch or wave." />,
    COL_JOB_TYPE: <RichTooltipContainer title="Job Type" description="Functional categorization (e.g., Picking, Packing)." />,
    COL_SOURCE: <RichTooltipContainer title="Source Intelligence" description="Indicates whether the job was planned by AI or manually." />,
    COL_ORDERS: <RichTooltipContainer title="Order Count" description="Number of discrete customer orders contained within this job." />,
    COL_LOCATIONS: <RichTooltipContainer title="Unique Locations" description="Count of distinct warehouse locations visited during this job." />,
    COL_SKUS: <RichTooltipContainer title="Unique SKUs" description="Count of distinct items (SKUs) handled in this job." />,
    COL_UNITS: <RichTooltipContainer title="Total Units" description="Sum of all item quantities processed in this job." />,

    // USER PERFORMANCE
    COL_RANK: <RichTooltipContainer title="Performance Rank" description="Relative ranking based on UPH (Occupancy)." />,
    COL_USER: <RichTooltipContainer title="Associate" description="Name or ID of the warehouse associate." />,
    COL_UPH_OCC: (
        <RichTooltipContainer
            title="UPH (Occupancy)"
            description="Units Per Hour calculated against total floor time (First Scan to Last Scan)."
            formula="Total Volume ÷ Shift Span"
        />
    ),
    COL_VOLUME: <RichTooltipContainer title="Total Volume" description="Total units processed by the user." />,
    COL_SPAN: <RichTooltipContainer title="Shift Span" description="Wall-clock time elapsed between the user's first and last activity." />,
    COL_DIRECT_TIME: (
        <RichTooltipContainer
            title="Active Time"
            description="Sum of durations where the user was actively performing tasks."
            excludes={["Gaps between tasks"]}
        />
    ),
    COL_UTIL_PERCENT: (
        <RichTooltipContainer
            title="Utilization %"
            description="Percentage of time spent on active work vs. idle/gap time."
            formula="(Active Time / Shift Span) * 100"
        />
    ),

    // ACTIVITY MATRIX
    COL_MATRIX_USER: <RichTooltipContainer title="Active Users" description="Users who had activity during the shift." />,
    COL_MATRIX_HOUR: <RichTooltipContainer title="Hour Block" description="Activity aggregated by hour of day (00:00 - 23:00)." />,
    COL_MATRIX_TOTAL: <RichTooltipContainer title="Shift Total" description="Total activity (Tasks or Volume) for the user across the entire shift." />
};
