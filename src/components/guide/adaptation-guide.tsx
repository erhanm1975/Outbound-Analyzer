import React from 'react';
import { MetricCard, ShiftTimelineVisual, TimelineCard } from './velocity-guide';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { DEFAULT_BUFFER_CONFIG } from '../../types';

export function AdaptationGuide() {
    const { settings } = useGlobalSettings(DEFAULT_BUFFER_CONFIG);
    const weights = settings.globalShiftParams?.aiMaturityWeights || { p1: 0.40, p2: 0.20, p3: 0.15, p4: 0.10, p5: 0.15 };

    // Format to percentages (e.g., 0.40 -> 40%)
    const p1 = Math.round(weights.p1 * 100);
    const p2 = Math.round(weights.p2 * 100);
    const p3 = Math.round(weights.p3 * 100);
    const p4 = Math.round(weights.p4 * 100);
    const p5 = Math.round(weights.p5 * 100);

    const dynamicFormula = `(P1 * ${p1}%) + (P2 * ${p2}%) + (P3 * ${p3}%) + (P4 * ${p4}%) + (P5 * ${p5}%)`;
    return (
        <div className="space-y-16 pb-12 text-slate-100">

            {/* 1. Summary Section */}
            <section className="space-y-4">
                <div className="prose prose-invert max-w-none">
                    <p className="text-lg text-slate-300 leading-relaxed">
                        The <strong>AI Adaptation Insights</strong> dashboard tracks the operational maturity of your facility. It evaluates how successfully the WMS has transitioned from legacy, manual task routing to advanced, AI-driven batching and spatial logic.
                    </p>
                    <p className="text-slate-400 text-lg">
                        Use this guide to understand exactly how the 1-10 Maturity Score is calculated, how the AI classifies jobs into the 7 hierarchical profiles, and how "Capacity Utilization" is evaluated.
                    </p>
                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 2. Primary Metrics */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500 text-3xl">psychology</span>
                    Primary Maturity Metrics
                </h2>

                <div className="grid grid-cols-1 gap-8">
                    {/* Unified AI Maturity Score */}
                    <MetricCard
                        title="Unified AI Maturity Score"
                        color="emerald"
                        direction="Higher is Better (Target: >8.5 Elite)"
                        scope="Facility-Wide Aggregate Score (1-10)"
                        formula={dynamicFormula}
                        description="This is the definitive grade for how 'smart' the facility is operating. It is a weighted aggregate of the 5 core operational phases (Hygiene, Layout, Synergy, Predictability, Complex Flows)."
                        example={{
                            scenario: `A facility scores a perfect 10 on Phase 1 (Hygiene), an 8 on Phase 2 (Layout), and 0 on the others because those advanced features are not configured.`,
                            math: `(10 * ${weights.p1.toFixed(2)}) + (8 * ${weights.p2.toFixed(2)}) + (0) = ${(10 * weights.p1 + 8 * weights.p2).toFixed(1)} Score`
                        }}
                    />

                    {/* AI Adaptation Index */}
                    <MetricCard
                        title="AI Adaptation Index"
                        color="blue"
                        direction="Higher is Better (Target: >6.0)"
                        scope="Weighted Job Profile Average"
                        formula="Sum(Volume * ProfileWeight) / Total Volume"
                        description="This index scores the 'quality' of your workflow selection. A high index means the system is deploying hyper-efficient job types (like Identical Item). A low index means the system is falling back to basic, discrete picking."
                        example={{
                            scenario: "The facility picked 1,000 units. 800 were identical items (Weight 10), and 200 were basic Order-Based (Weight 1).",
                            math: "((800 * 10) + (200 * 1)) / 1000 = 8.2 Index"
                        }}
                        note="Profile Weights: Identical Item (10), Identical Orders (9), Mixed Singles (8), Put-to-Wall (7), Multi-Item (5), Order-Based (1)."
                    />

                    {/* Under-Utilization */}
                    <MetricCard
                        title="Under-Utilization (Batch Capacity)"
                        color="amber"
                        direction="Higher is Better (Target: >80%)"
                        scope="Average Batch vs Equipment Limit"
                        formula="Average Orders per Batch / Standard Capacity"
                        description="Evaluates if pickers are pushing mostly-empty carts. It calculates the physical capacity limit of your carts/equipment (Standard Capacity) and compares it to the actual average number of orders you are putting in them."
                        example={{
                            scenario: "The system detects that your largest batches consistently hold 10 orders (Standard Capacity). However, across the day, the average worker is only being assigned 6 orders per job.",
                            math: "(6 Avg / 10 Capacity) * 100 = 60% Capacity Used (Potential Waste)"
                        }}
                        note="Standard Capacity is dynamically learned by taking the average size of the top 5 largest jobs the facility has executed."
                    />

                    {/* Utilization Timeline Visual */}
                    <ShiftTimelineVisual
                        title="Utilization compares average batch size against the physical equipment limit."
                        metricLabel="Under-Utilization"
                        accentColor="border-amber-500/20"
                        segments={[
                            { label: 'Order', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Order', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Order', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Order', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Order', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Order', width: 'w-[10%]', color: 'bg-cyan-600', textColor: 'text-white' },
                            { label: 'Empty', width: 'w-[10%]', color: 'bg-slate-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Empty', width: 'w-[10%]', color: 'bg-slate-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Empty', width: 'w-[10%]', color: 'bg-slate-600/40', textColor: 'text-white/60', excluded: true },
                            { label: 'Empty', width: 'w-[10%]', color: 'bg-slate-600/40', textColor: 'text-white/60', excluded: true },
                        ]}
                        includedLabel="Filled Capacity: The average number of orders assigned per job."
                        excludedLabel="Wasted Capacity: Equipment space moving empty."
                        note="The entire 10-block bar represents 100% of your cart's physical capacity (e.g., a 10-tote cart). Every striped block is an empty tote being pushed around the warehouse for zero value."
                    />
                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 3. Task Performance Breakdown (Timeline) */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-purple-500 text-3xl">list_alt</span>
                    The 7-Tier Job Dictionary
                </h2>
                <p className="text-slate-400 text-lg">
                    Every batch generated by the WMS is evaluated against a strict 1-7 hierarchical waterfall. The AI attempts to classify every job into the highest possible tier (Tier 1 being best) to maximize spatial density and minimize travel.
                </p>

                <div className="space-y-6">
                    {/* Tier 1 */}
                    <TimelineCard
                        title="1. Put-to-Wall Job"
                        icon="factory"
                        color="slate"
                        definition="High-volume batch pick of orders sorted into a physical wall."
                        formula="Jobs containing 'Sorting' tasks."
                        example="Worker picks 50 disparate items into a single bulk tote, then walks to a sorting wall to divide them into 20 customer cubbies."
                        diagnosticUse="Maxes out 'Flow Capacity'. The time saved walking aisles vastly outweighs the secondary sorting step."
                    />

                    {/* Tier 2 */}
                    <TimelineCard
                        title="2. Identical Item Order Job"
                        icon="layers"
                        color="blue"
                        definition="A batch where every order has 1 SKU, and the entire job has only 1 SKU."
                        formula="Job has 1 SKU total, >1 Orders, and every order has 1 SKU."
                        example="100 customers ordered the exact same iPhone case. The picker walks to that bin once, grabs 100 cases, and brings them back for labeling."
                        diagnosticUse="Produces massive reductions in 'Distinct Locations Visited'. This should always be the highest priority workflow if inventory exists."
                    />

                    {/* Tier 3 */}
                    <TimelineCard
                        title="3. Single Item Job (Mixed Singles)"
                        icon="receipt_long"
                        color="emerald"
                        definition="A batch of single-unit orders with disparate SKUs."
                        formula="Orders have 1 Unit/1 SKU, >1 Orders, Not Identical Item Job."
                        example="Worker picks 1 book, 1 shirt, 1 mug into a single bin. Since each item goes to a different customer, they can be randomly picked and scanned individually at pack."
                        diagnosticUse="Increases Density by allowing the AI to route the shortest possible 'Snake Path' without worrying about keeping items separated on the cart."
                    />

                    {/* Tier 4 */}
                    <TimelineCard
                        title="4. Identical Order Jobs"
                        icon="inventory_2"
                        color="amber"
                        definition="Orders that have the exact same combination of items and quantities."
                        formula="Multiple orders with exact same SKU+Qty usage."
                        example="5 customers ordered the same Shampoo + Conditioner bundle. The picker grabs 5x of each and they are packed identically."
                        diagnosticUse="Reduces 'Job Consolidation' costs and dramatically boosts Packing UPH because packers get into a repetitive rhythm."
                    />

                    {/* Tier 5 */}
                    <TimelineCard
                        title="5. Order Based Job"
                        icon="local_shipping"
                        color="slate"
                        definition="A classic discrete pick—a job containing exactly one order."
                        formula="Job contains exactly 1 order."
                        example="A customer orders a heavy TV and a blender. A worker takes a cart to get just those two items for that single order."
                        diagnosticUse="Simple flow but terrible density. Used as a fallback when orders are too large to batch, or if the wave lacks enough density to group."
                    />

                    {/* Tier 6 */}
                    <TimelineCard
                        title="6. Multi-Item Order Job"
                        icon="grid_view"
                        color="slate"
                        definition="Batch containing multiple orders, not matching previous single/identical profiles."
                        formula="Multiple orders, mixed SKUs, not fitting Types 2-4."
                        example="Worker picks 3 different multi-item orders using a specialized cart where items must be separated into specific order compartments 'Sort-While-Picking'."
                        diagnosticUse="Optimizes travel for complex batches, but lowers worker speed due to the cognitive load of matching items to specific order totes on the cart."
                    />

                    {/* Tier 7 */}
                    <TimelineCard
                        title="7. Complex Jobs"
                        icon="settings"
                        color="slate"
                        definition="Advanced profiles and unidentified flows."
                        formula="Not Available for now."
                        example="Legacy workflows or external system integrations holding orders that don't fit the standard P01 operational models."
                        diagnosticUse="If a high percentage of jobs fall here, the facility is bypassing the AI standard logic completely."
                    />
                </div>
            </section>

            <hr className="border-slate-800" />

            {/* 4. Detailed Phase Diagnostics */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500 text-3xl">fact_check</span>
                    Detailed Phase Diagnostics
                </h2>
                <p className="text-slate-400 text-lg">
                    The AI Maturity Score evaluates operations across 5 sequential phases. A facility must master foundational phases (like Hygiene) before advanced phases (like Predictability) can be unlocked.
                </p>

                <div className="space-y-6">
                    {/* Phase 1 */}
                    <div className="space-y-4">
                        <TimelineCard
                            title="Phase 1: Operational Hygiene & Discipline"
                            icon="cleaning_services"
                            color="emerald"
                            definition="Optimizing order grouping and stop reduction using standard WMS logic data."
                            formula="Data Source: Standard WMS Shift Records (JobCode, TaskType, Location, Client, IS AI?). Evaluates 5 core sub-metrics (detailed below)."
                            example="If picker carts regularly go out half-empty, the system flags wasted capacity and deducts from the P1 Score."
                            diagnosticUse="Highest default weight (40%). Assesses if foundational rules are being followed before attempting complex spatial optimizations."
                        />
                        {/* Phase 1 Sub-Metrics */}
                        <div className="ml-12 pl-6 border-l-2 border-slate-700/50 space-y-4">
                            <div className="bg-slate-800/20 p-4 rounded-lg border border-slate-700/50">
                                <h4 className="text-emerald-400 font-semibold mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-sm">analytics</span> 1. Weighted Job Mix Index</h4>
                                <p className="text-slate-400 text-sm">Calculated by weighting order profiles (e.g. Identical Item = 10, Order Based = 1). The target is an index <strong>&gt; 6.0</strong>, meaning the WMS is actively utilizing dense batching strategies rather than discrete picking.</p>
                            </div>
                            <div className="bg-slate-800/20 p-4 rounded-lg border border-slate-700/50">
                                <h4 className="text-emerald-400 font-semibold mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-sm">data_usage</span> 2. Batch Utilization Ratio</h4>
                                <p className="text-slate-400 text-sm">Compares the average batch size against the physical equipment limit (Top 5 Average Capacity). The target is <strong>&gt; 80%</strong> utilization to ensure workers aren't pushing empty carts.</p>
                            </div>
                            <div className="bg-slate-800/20 p-4 rounded-lg border border-slate-700/50">
                                <h4 className="text-emerald-400 font-semibold mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-sm">format_list_bulleted</span> 3. Consolidate Waves</h4>
                                <p className="text-slate-400 text-sm">Evaluates the raw size of assigned waves. The target is an average of <strong>&gt; 100 units per wave</strong>. Small waves indicate fragmented releasing and poor planning logic.</p>
                            </div>
                            <div className="bg-slate-800/20 p-4 rounded-lg border border-slate-700/50">
                                <h4 className="text-emerald-400 font-semibold mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-sm">layers</span> 4. Location Multi-Tenancy</h4>
                                <p className="text-slate-400 text-sm">Validates if the WMS is sharing picking locations across multiple distinct clients (Target: <strong>&gt; 0 shared locs</strong>). This demonstrates advanced space utilization common in optimized 3PLs.</p>
                            </div>
                            <div className="bg-slate-800/20 p-4 rounded-lg border border-slate-700/50">
                                <h4 className="text-emerald-400 font-semibold mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-sm">smart_toy</span> 5. AI Job Origin (Manual Order Ratio)</h4>
                                <p className="text-slate-400 text-sm">Measures what percentage of batched orders were <strong>manually created</strong> rather than generated by the AI orchestration engine. Detected via the <code>IS AI?</code> / <code>AI Job Description</code> column in the raw dataset. Scoring: <strong>0% manual = 10 pts</strong>, decreasing to 0 pts at ≥ 9% manual. Target: <strong>&lt; 1% manual job creation</strong>.</p>
                            </div>
                        </div>
                    </div>

                    {/* Phase 2 */}
                    <TimelineCard
                        title="Phase 2: Layout Intelligence"
                        icon="map"
                        color="blue"
                        definition="Calculating true 'Snake Path' travel using the physical 2D layout."
                        formula="Data Source: Global System Settings. Calculation: Checks if '2D Warehouse Layout' configuration is activated. Binary score (Active=10, Inactive=0)."
                        example="Instead of sorting bins alphanumerically to path workers, the system generates shortest-distance routing through real physical aisles."
                        diagnosticUse="Penalizes systems that rely on alphabetical or sequential bin sorting rather than true physical distance sequencing to build picker travel paths."
                    />

                    {/* Phase 3 */}
                    <TimelineCard
                        title="Phase 3: Multi-Client Synergy"
                        icon="hub"
                        color="purple"
                        definition="Breaking 'Client Silos' in 3PLs to batch work across different accounts."
                        formula="Data Source: Standard WMS Shift Records (Client, JobCode). Calculation: Scans all executed jobs and counts the absolute number where the contained orders belong to > 1 distinct Client. Binary score (Active=10, Inactive=0)."
                        example="Worker picks Client A's shampoo and Client B's soap in the same trip because they are located in adjacent aisles."
                        diagnosticUse="Crucial for 3PLs to realize cross-account labor savings even if inventory is strictly separated."
                    />

                    {/* Phase 4 */}
                    <TimelineCard
                        title="Phase 4: Engineered Labor Standards & ML"
                        icon="functions"
                        color="amber"
                        definition="Learning the specific facility's velocity to accurately predict completion."
                        formula="Data Source: Global System Settings. Calculation: Checks if 'Engineered Labor Standards' configuration is activated. Binary score (Active=10, Inactive=0)."
                        example="The system monitors actual execution speeds and dynamically restates wave completion ETAs based on recent performance."
                        diagnosticUse="Predictiveness drives reliable shipping cutoff and SLA adherence."
                    />

                    {/* Phase 5 */}
                    <TimelineCard
                        title="Phase 5: Advanced Fulfillment Flows"
                        icon="account_tree"
                        color="slate"
                        definition="Sophisticated setups requiring high-coordination logic."
                        formula="Data Source: WMS Job Types (Sorting / Put-to-Wall Identifiers). Calculation: Sums the total volume of active Put-to-Wall jobs or complex Mixed-Tote flows. Binary score (Active=10, Inactive=0)."
                        example="Simultaneously dispatching multiple complex profiles (Mixed Singles vs Multi-Items) to keep both pickers and packers saturated."
                        diagnosticUse="Required for maximum peak season scalability."
                    />
                </div>
            </section>
        </div>
    );
}
