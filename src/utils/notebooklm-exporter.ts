interface JobTypeStats {
    count: number;
    volume: number;
    jobs: string[];
}

interface PhaseResult {
    answer: string;
    value: string;
    isPositive: boolean;
    explanation: string;
    score: number;
}

interface PhaseScore {
    score: number;
    results: PhaseResult[];
}

interface ScoreData {
    scores: Record<string, PhaseScore>;
    weightedScore: number;
    label: string;
    color: string;
    bg: string;
    desc: string;
}

interface JobStats {
    [key: string]: JobTypeStats;
}

const JOB_TYPE_DEFINITIONS: Record<string, { title: string; definition: string; aiLogic: string; workflow: string; impact: string }> = {
    'PUT_TO_WALL': {
        title: '1. Put-to-Wall Job',
        definition: 'High-volume batch pick of orders sorted into a physical wall.',
        aiLogic: 'Prioritizes minimum travel by batching massive quantities of disparate SKUs.',
        workflow: 'High-speed "bulk harvester" picking, items sorted into order-specific cubbies at Sort Wall.',
        impact: 'Maximizes Flow Capacity. Spatial savings outweigh secondary sort time.'
    },
    'IDENTICAL_ITEM': {
        title: '2. Identical Item Order Job',
        definition: 'A batch where every order has 1 SKU, and the entire job has only 1 SKU.',
        aiLogic: 'Groups all single-unit orders for a high-volume SKU into a single assignment.',
        workflow: 'Picker travels to one location and picks total sum of units at once. Batch Labeling: Scan one item to validate whole batch.',
        impact: 'Massive reduction in "Distinct Locations Visited".'
    },
    'MIXED_SINGLES': {
        title: '3. Single Item Job (Mixed Singles)',
        definition: 'A batch of single-unit orders with different SKUs.',
        aiLogic: 'Clusters disparate SKUs based on physical proximity to create shortest "Snake Path".',
        workflow: 'Continuous path picking various items into shared container. Scan-to-Print: Scan any item to identify order.',
        impact: 'Increases "Density (Locs/Unit)".'
    },
    'IDENTICAL_ORDERS': {
        title: '4. Identical Order Jobs',
        definition: 'Orders that have the exact same combination of items and quantities.',
        aiLogic: 'Searches for identical "baskets" across the order pool.',
        workflow: 'Visits only locations needed for that SKU combination. Pulse Flow: Labels applied to pre-staged sets.',
        impact: 'Reduces "Job Consolidation" costs and boosts Packing UPH.'
    },
    'ORDER_BASED': {
        title: '5. Order Based Job',
        definition: 'A job containing exactly one order.',
        aiLogic: 'Standard discrete picking for large or special orders.',
        workflow: 'Pick & Pass or discrete pick. Standard pack station.',
        impact: 'Simple flow but lower density.'
    },
    'MULTI_ITEM': {
        title: '6. Multi-Item Order Job',
        definition: 'Batch containing multiple orders with mixed SKUs, not matching previous profiles.',
        aiLogic: 'Sequences orders so picker touches fewest aisles.',
        workflow: 'Sort-While-Picking or Cluster Pick. Standard pack.',
        impact: 'Optimizes travel for complex clean batches.'
    },
    'COMPLEX': {
        title: '7. Complex Jobs',
        definition: 'Advanced profiles (Not available for now).',
        aiLogic: 'N/A',
        workflow: 'N/A',
        impact: 'N/A'
    }
};

const PHASE_DEFINITIONS = [
    {
        id: 'P1',
        title: 'Phase 1: Operational Hygiene & Discipline',
        weight: '40%',
        focus: 'Operational Hygiene',
        outcome: 'Higher Throughput, Lower Admin',
        description: 'In this initial phase, the AI focuses on low-hanging fruit: optimizing order grouping and stop reduction using standard WMS logic data.',
        levers: [
            'Job Type Selection: Deploying Identical Item, Single Item, and Multi-Item batching.',
            'Normalization of Wave Scheduling: Transitioning from "too many small waves" to optimized intervals.',
            'Batch Size Optimization: Correcting equipment under-utilization.',
            'AI Adoption Discipline: Minimizing manual "top-off" waves.'
        ],
        metrics: ['Picked UPH / Packed UPH', 'Distinct Locations Visited', 'Density (Locs/Unit)']
    },
    {
        id: 'P2',
        title: 'Phase 2: Spatial Intelligence',
        weight: '20%',
        focus: 'Travel Waste',
        outcome: 'Reduced Fatigue, Faster Path',
        description: 'Once the building layout (X, Y coordinates) is uploaded, the AI stops guessing about travel and begins calculating the true "Snake Path".',
        levers: [
            '2D Layout Integration: Using physical distance between bins.',
            'Snake Path Calculation: Minimizing backtracking and cross-alley travel.'
        ],
        metrics: ['Transition Friction', 'Active Scan Ratio', 'UPH (Pure Active)', 'Average Task Duration']
    },
    {
        id: 'P3',
        title: 'Phase 3: 3PL Synergy (Multi-Client)',
        weight: '15%',
        focus: '3PL Consolidation',
        outcome: 'Cross-Client Labor Savings',
        description: 'In a 3PL environment, the AI breaks the "Client Silo" to find efficiency across different customers, even when inventory is not shared.',
        levers: [
            'Spatial Overlap: Identifying orders for different clients in same aisles.',
            'Path Consolidation: Merging travel paths across accounts.'
        ],
        metrics: ['SKU Batchability (Spatial)', 'Average Units/Job (Depth)']
    },
    {
        id: 'P4',
        title: 'Phase 4: Engineered Standards & ML',
        weight: '10%',
        focus: 'Predictability',
        outcome: 'Perfect Shipping Cut-off Hits',
        description: 'The system stops using "static" assumptions and starts learning the behavioral reality of the specific warehouse.',
        levers: [
            'Execution Learning: Monitoring actual task times vs assumptions.',
            'Dynamic Prediction: Predicting exact wave completion times.'
        ],
        metrics: ['Completion Prediction Accuracy', 'Pick-to-Pack Sync']
    },
    {
        id: 'P5',
        title: 'Phase 5: Advanced Fulfillment',
        weight: '15%',
        focus: 'High Capacity',
        outcome: 'Peak Season Scalability',
        description: 'The final phase introduces sophisticated physical flows that require high-coordination logic.',
        levers: [
            'Advanced Setups: Enabling Put-to-Wall and Mixed Tote Carts.',
            'Flow Optimization: Simultaneously picking singles, identicals, and multis.'
        ],
        metrics: ['Flow Capacity (Hr)', 'Lines per Job']
    }
];

export function generateNotebookLMExport(
    jobStats: JobStats,
    scoreData: ScoreData,
    totalJobs: number,
    metadata: any
): void {
    const timestamp = new Date().toLocaleString();
    const date = new Date().toISOString().split('T')[0];

    let markdown = '';

    // =====================
    // DOCUMENT HEADER
    // =====================
    markdown += `# AI Adaptation Insights - Operational Intelligence Report\n\n`;
    markdown += `**Generated:** ${timestamp}\n`;
    markdown += `**Report Type:** Detailed Analysis for AI Processing\n`;
    markdown += `**Data Source:** Warehouse Operations - Shift Records Analysis\n\n`;
    markdown += `---\n\n`;

    // =====================
    // EXECUTIVE SUMMARY
    // =====================
    markdown += `## Executive Summary\n\n`;
    markdown += `This report provides a comprehensive analysis of warehouse AI orchestration maturity, evaluating how effectively artificial intelligence is being leveraged to optimize fulfillment operations.\n\n`;

    markdown += `### Unified AI Maturity Score\n\n`;
    markdown += `**Overall Score:** ${scoreData.weightedScore.toFixed(2)}/10.00\n\n`;
    markdown += `**Classification:** ${scoreData.label}\n\n`;
    markdown += `**Assessment:** ${scoreData.desc}\n\n`;

    markdown += `#### Maturity Scale Reference\n\n`;
    markdown += `- **Elite / Autonomous (8.5-10.0):** Benchmark facility. Operation is fully optimized with advanced AI orchestration.\n`;
    markdown += `- **High-Performing (6.0-8.4):** Modern AI-driven operation with minor manual friction points.\n`;
    markdown += `- **Developing (3.0-5.9):** Transitioning away from legacy WMS constraints, showing progress.\n`;
    markdown += `- **Foundational (<3.0):** Relying primarily on manual or basic batching logic.\n\n`;

    // =====================
    // SCORING METHODOLOGY
    // =====================
    markdown += `### Scoring Methodology\n\n`;
    markdown += `The Unified AI Maturity Score is calculated using a weighted average across five maturation phases:\n\n`;

    PHASE_DEFINITIONS.forEach(phase => {
        const phaseScore = scoreData.scores[phase.id].score;
        markdown += `- **${phase.title}** (Weight: ${phase.weight}): ${phaseScore.toFixed(2)}/10\n`;
    });

    markdown += `\nWeighted calculation ensures critical operational hygiene (P1) has the most significant impact on overall maturity.\n\n`;
    markdown += `---\n\n`;

    // =====================
    // JOB TYPE ANALYSIS
    // =====================
    markdown += `## Job Type Distribution Analysis\n\n`;
    markdown += `AI-driven job classification reveals how the warehouse management system is batching orders for optimal execution. This section identifies the optimization profiles detected in the operational data.\n\n`;
    markdown += `### Job Type Hierarchy (Priority Order)\n\n`;
    markdown += `The following job types are classified using a strict 7-step hierarchy. Each job is assigned to the first matching category:\n\n`;

    Object.entries(jobStats).forEach(([typeId, stats]) => {
        if (typeId !== 'UNKNOWN' || stats.count > 0) {
            const def = JOB_TYPE_DEFINITIONS[typeId];
            if (!def) return;

            const percentage = totalJobs > 0 ? ((stats.count / totalJobs) * 100).toFixed(2) : '0.00';

            markdown += `#### ${def.title}\n\n`;
            markdown += `**Detected:** ${stats.count} jobs (${percentage}% of total)\n`;
            markdown += `**Volume:** ${stats.volume.toLocaleString()} units\n\n`;
            markdown += `**Definition:** ${def.definition}\n\n`;
            markdown += `**AI Logic:** ${def.aiLogic}\n\n`;
            markdown += `**Workflow:** ${def.workflow}\n\n`;
            markdown += `**KPI Impact:** ${def.impact}\n\n`;

            if (stats.jobs.length > 0) {
                markdown += `**Sample Job Codes:** ${stats.jobs.slice(0, 5).join(', ')}`;
                if (stats.jobs.length > 5) {
                    markdown += ` *(+${stats.jobs.length - 5} more)*`;
                }
                markdown += `\n\n`;
            }
        }
    });

    markdown += `### Job Type Summary Statistics\n\n`;
    markdown += `| Job Type | Count | Volume | Percentage |\n`;
    markdown += `|----------|-------|--------|------------|\n`;

    Object.entries(jobStats).forEach(([typeId, stats]) => {
        if (typeId !== 'UNKNOWN' || stats.count > 0) {
            const def = JOB_TYPE_DEFINITIONS[typeId];
            const typeName = def ? def.title : typeId;
            const percentage = totalJobs > 0 ? ((stats.count / totalJobs) * 100).toFixed(2) : '0.00';
            markdown += `| ${typeName} | ${stats.count} | ${stats.volume.toLocaleString()} | ${percentage}% |\n`;
        }
    });

    markdown += `\n**Total Jobs Analyzed:** ${totalJobs}\n\n`;
    markdown += `---\n\n`;

    // =====================
    // PHASE-BY-PHASE ANALYSIS
    // =====================
    markdown += `## Detailed Phase-by-Phase Analysis\n\n`;
    markdown += `Each maturation phase represents a specific operational capability. Phases build on each other, with later phases requiring strong foundations from earlier phases.\n\n`;

    PHASE_DEFINITIONS.forEach((phase, _idx) => {
        const phaseScore = scoreData.scores[phase.id];

        markdown += `### ${phase.title}\n\n`;
        markdown += `**Weight in Overall Score:** ${phase.weight}\n`;
        markdown += `**Phase Score:** ${phaseScore.score.toFixed(2)}/10.00\n`;
        markdown += `**Focus Area:** ${phase.focus}\n`;
        markdown += `**Success Outcome:** ${phase.outcome}\n\n`;

        markdown += `#### Phase Description\n\n`;
        markdown += `${phase.description}\n\n`;

        markdown += `#### Key Operational Levers\n\n`;
        phase.levers.forEach(lever => {
            markdown += `- ${lever}\n`;
        });
        markdown += `\n`;

        markdown += `#### Impacted Metrics\n\n`;
        phase.metrics.forEach(metric => {
            markdown += `- ${metric}\n`;
        });
        markdown += `\n`;

        markdown += `#### Diagnostic Results\n\n`;

        phaseScore.results.forEach((result, qIdx) => {
            const status = result.isPositive ? '✓ POSITIVE' : '⚠ NEEDS ATTENTION';
            const _statusEmoji = result.isPositive ? '✓' : '⚠';

            markdown += `##### Question ${qIdx + 1}\n\n`;
            markdown += `**Answer:** ${result.answer}\n\n`;
            markdown += `**Value:** ${result.value}\n\n`;
            markdown += `**Score:** ${result.score}/10\n\n`;
            markdown += `**Status:** ${status}\n\n`;
            markdown += `**Analysis Method:** ${result.explanation}\n\n`;
        });

        markdown += `---\n\n`;
    });

    // =====================
    // OPERATIONAL CONTEXT
    // =====================
    markdown += `## Operational Context & Metadata\n\n`;
    markdown += `### Analyzed Dataset\n\n`;
    markdown += `- **Total Waves:** ${metadata.totalWaves || 'N/A'}\n`;
    markdown += `- **Total Volume:** ${(metadata.totalVolume || 0).toLocaleString()} units\n`;
    markdown += `- **Avg Units per Job:** ${(metadata.avgUnitsPerJob || 0).toFixed(2)}\n`;
    markdown += `- **Multi-Client Jobs:** ${metadata.multiClientJobCount || 0}\n`;
    markdown += `- **Visits per Unit:** ${(metadata.visitsPerUnit || 0).toFixed(2)}\n\n`;

    // =====================
    // KEY FINDINGS
    // =====================
    markdown += `## Key Findings & Recommendations\n\n`;
    markdown += `### Strengths\n\n`;

    const strongPhases = PHASE_DEFINITIONS.filter(p => scoreData.scores[p.id].score >= 7);
    if (strongPhases.length > 0) {
        strongPhases.forEach(p => {
            markdown += `- **${p.title}:** Score ${scoreData.scores[p.id].score.toFixed(2)}/10 - Strong performance in ${p.focus.toLowerCase()}\n`;
        });
    } else {
        markdown += `- No phases currently scoring above 7.0 (Strong threshold)\n`;
    }
    markdown += `\n`;

    markdown += `### Areas for Improvement\n\n`;
    const weakPhases = PHASE_DEFINITIONS.filter(p => scoreData.scores[p.id].score < 4);
    if (weakPhases.length > 0) {
        weakPhases.forEach(p => {
            markdown += `- **${p.title}:** Score ${scoreData.scores[p.id].score.toFixed(2)}/10 - Requires immediate attention\n`;
        });
    } else {
        markdown += `- No phases currently scoring below 4.0 (Critical threshold)\n`;
    }
    markdown += `\n`;

    markdown += `### Priority Actions\n\n`;
    markdown += `Based on the weighted scoring model, focus improvement efforts on:\n\n`;
    const sortedPhases = [...PHASE_DEFINITIONS].sort((a, b) => {
        const scoreA = scoreData.scores[a.id].score;
        const scoreB = scoreData.scores[b.id].score;
        const weightA = parseFloat(a.weight);
        const weightB = parseFloat(b.weight);
        // Lower score with higher weight = higher priority
        return (scoreA * weightA) - (scoreB * weightB);
    });

    sortedPhases.slice(0, 3).forEach((p, idx) => {
        markdown += `${idx + 1}. **${p.title}** - Current score: ${scoreData.scores[p.id].score.toFixed(2)}, Weight: ${p.weight}\n`;
    });

    markdown += `\n---\n\n`;

    // =====================
    // FOOTER
    // =====================
    markdown += `## Document Information\n\n`;
    markdown += `- **Report Format:** NotebookLM-Optimized Markdown\n`;
    markdown += `- **Generated:** ${timestamp}\n`;
    markdown += `- **Version:** 1.0\n`;
    markdown += `- **Purpose:** AI-assisted analysis and report generation\n\n`;
    markdown += `---\n\n`;
    markdown += `*This document is optimized for ingestion by AI analysis tools like Google NotebookLM. It contains structured operational intelligence data for warehouse fulfillment optimization.*\n`;

    // =====================
    // EXPORT AS FILE
    // =====================
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adaptation-insights-notebooklm-${date}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
