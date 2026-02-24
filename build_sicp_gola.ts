import fs from 'fs';

const configRaw = fs.readFileSync('./src/data/global-engineered-standards.json', 'utf8');
const config = { engineeredStandards: JSON.parse(configRaw) };

const pickingSicp = config.engineeredStandards.cards.find((c: any) => c.id === 'picking_sicp');
const packingSicp = config.engineeredStandards.cards.find((c: any) => c.id === 'packing_sicp');

const pickOh = 150 + 100; // 250
const pickLoc = 45 + 3; // 48
const pickSku = 3 + 4 + 7; // 14
const pickLine = 3;

const packOh = 10;
const packOrder = 5 + 2 + 10 + 5 + 1 + 4 + 2 + 3; // 32
const packUnit = 2 + 2; // 4

// Create 15 single item orders.
const nofOrders = 15;
const testData = [];
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();

// Pick phase: 1 batch job
const pickJobCode = "SICP-BATCH-001";
for (let i = 1; i <= nofOrders; i++) {
    testData.push({
        "Job Type": "SICP",
        "Wave Id": "WAVE-SICP-1",
        "Job Code": pickJobCode,
        "Task Type": "Picking",
        "Order Code": `ORD-SICP-${i}`,
        "SKU": `SKU-SICP-${i}`,
        "Source location": `LOC-${i}`, // 15 unique locations
        "Task UOM Qty": 1, // Single unit
        "Executed By User": "GOLA Audit Bot",
        "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
        "Finish Date": new Date(cursorTime + 60000).toISOString().replace('T', ' ').substring(0, 19)
    });
    cursorTime += 60000;
}

// Pack phase: maybe packed at station sequentially. Same Job Code, or different?
// Let's use the Order Code for Job Code in Packing, or keep it BATCH-1? 
// The user said: "lets crete 1 job for all single item single unit orders and pick and pack them."
// So Job Code = SICP-BATCH-001 for both pick and pack.
for (let i = 1; i <= nofOrders; i++) {
    testData.push({
        "Job Type": "SICP",
        "Wave Id": "WAVE-SICP-1",
        "Job Code": pickJobCode,
        "Task Type": "Packing",
        "Order Code": `ORD-SICP-${i}`,
        "SKU": `SKU-SICP-${i}`,
        "Source location": `PACK-STATION`,
        "Task UOM Qty": 1,
        "Executed By User": "GOLA Audit Bot",
        "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
        "Finish Date": new Date(cursorTime + 60000).toISOString().replace('T', ' ').substring(0, 19)
    });
    cursorTime += 60000;
}

// Math logic:
// Picking: 
// 1 Job Overhead = 250s
// 15 Locations = 15 * 48 = 720s
// 15 SKUs = 15 * 14 = 210s
// 15 Lines = 15 * 3 = 45s
const expectedPick = 250 + (15 * 48) + (15 * 14) + (15 * 3); // 250 + 720 + 210 + 45 = 1225s

// Packing:
// Wait, if JobCode = SICP-BATCH-001 the whole time, then `isFirstTaskInJob` is false for the first packing task because it just continues from picking?
// No, the warehouse-transform logic groups tasks. Does it group pack tasks with pick tasks if JobCode is same? Yes.
// In `calculateBenchmarks`:
// `packingCardId` evaluateCard applies `initStd` if `cId === packingCardId && flowClass !== 'OBPP'` it uses `job_init` variable! Wait... 
// Let's look at warehouse-transform.ts line 431:
// if (cId === packingCardId && flowClass !== 'OBPP') { initStd = getVar('job_init', 'Packing Init (Std)').std; }
// Is this correct for SICP? 
// SICP will evaluate evaluateCard(packingCardId, isFirstPackingTaskInOrder).
// If `isFirstPackingTaskInOrder` is true, it gets the `Job Overhead` from packing_sicp which is 10s.
// Let's just calculate it.
const expectedPack = (nofOrders * 10) + (nofOrders * 32) + (nofOrders * 4); // 15*10 + 15*32 + 15*4 = 150 + 480 + 60 = 690s

const totalStandardSeconds = expectedPick + expectedPack; // 1225 + 690 = 1915s

const newScenario = {
    id: "SICP-01",
    name: "SICP Standards Audit",
    description: "Validates the happy path calculation for SICP jobs, representing single-item, single-unit orders picked in a batch and packed individually.",
    category: "ENGINEERED_STANDARDS",
    environmentId: "JOB_ANALYZER_LOCAL",
    explanation: "Calculates Travel, Search, and Pick times for batch picking, then packing times for each discrete unit/order.",
    logic: "Batch Job Overhead applied once for picking. Location/SKU/Line multipliers applied. Pack Job Overhead applied per order.",
    status: "IDLE",
    steps: [
        "Load static SICP payload",
        "Parse into ShiftRecords",
        "Execute Happy Path Calculation",
        "Assert Final Standard Time matches Expected Results"
    ],
    expectedResults: { totalStandardSeconds },
    testData
};

const golaRaw = fs.readFileSync('./src/data/gola-audit-scenarios.json', 'utf8');
const gola = JSON.parse(golaRaw);
const idx = gola.findIndex(g => g.id === 'SICP-01');
if (idx > -1) {
    gola[idx] = newScenario;
} else {
    gola.push(newScenario);
}

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(gola, null, 4));

// Generate the markdown breakdown!
let md = `# SICP GOLA Payload: End-to-End Job Breakdown (Batch Pick + Per-Order Pack)\n\n`;
md += `This breakdown evaluates the SICP GOLA test payload, combining ${nofOrders} single-item, single-unit orders into a **single Picking Batch Job**, followed by individual packing.\n\n`;

md += `## Baseline Multipliers (SICP Picking)\n`;
md += `- **Job Overhead** (1x per BATCH): Job Init + Job Fin = **250s**\n`;
md += `- **Location Based** (1x per Location Visit): Travel Location (45s) + Scan Loc (3s) = **48s**\n`;
md += `- **SKU Base** (1x per Loc+SKU): Scan (3s) + Type Qty (4s) + Pick (7s) = **14s**\n`;
md += `- **Line Based** (1x per Line): Scan Tote = **3s**\n`;

md += `\n## Baseline Multipliers (SICP Packing)\n`;
md += `- **Job Overhead** (1x per Order): Pack Init = **10s**\n`;
md += `- **Order Base** (1x per Order): Box/Print/Close/Label/Put = **32s**\n`;
md += `- **Unit Variable** (1x per Unit): Scan/Put = **4s**\n\n`;

md += `## Aggregate Mathematical Validation\n\n`;

md += `| Phase | Overhead | Loc | SKU | Line  | Pack OH | Pack Order | Pack Unit | **Total Standard** |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
md += `| **PICKING** | 250s | 15 x 48s = 720s | 15 x 14s = 210s | 15 x 3s = 45s | 0 | 0 | 0 | **1225s** |\n`;
md += `| **PACKING** | 0 | 0 | 0 | 0 | 15 x 10s = 150s | 15 x 32s = 480s | 15 x 4s = 60s | **690s** |\n`;
md += `| **GRAND TOTAL** | -- | -- | -- | -- | -- | -- | -- | **1915s** |\n\n`;

fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/sicp_detailed_breakdown.md', md);
fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/sicp_import_jobs.json', JSON.stringify(testData, null, 2));

console.log('Successfully generated SICP-01 scenario, breakdown MD, and JSON export!');
