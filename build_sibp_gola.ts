import fs from 'fs';

const configRaw = fs.readFileSync('./src/data/global-engineered-standards.json', 'utf8');
const config = { engineeredStandards: JSON.parse(configRaw) };

// SIBP Standards mapping
const pickOh = 200; // picking_sibp Job Overhead
const pickLoc = 13; // Location Based
const pickSku = 17; // SKU Base

const packOh = 10; // packing_sibp Job Overhead
const packOrder = 32; // Order Base
const packUnit = 4; // Unit Variable

const testData: any[] = [];
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();

// SCENARIO: Single item orders. 1 job for ALL the single items.
// Let's create 30 Single-Item Orders.
// Being picked in 1 single continuous job.
const nofOrders = 30; // 30 orders
const pickJobCode = "SIBP-BATCH-001";

// For realistic picking, let's say they are spread across 15 Locations, with 30 distinct SKUs
const numLocs = 15;
const numSkus = 30;

// Phase 1: Picking (1 Job, 30 Orders, 15 Locations, 30 SKUs)
for (let i = 1; i <= nofOrders; i++) {
    // 2 SKUs per location for simplicity
    const locId = Math.ceil(i / 2);
    const sku = `SKU-SIBP-${i}`;
    const loc = `LOC-SIBP-${locId}`;
    const orderCode = `ORD-SIBP-${i}`;

    testData.push({
        "Job Type": "SIBP",
        "Wave Id": "WAVE-SIBP-1",
        "Job Code": pickJobCode,
        "Task Type": "Picking",
        "Order Code": orderCode,
        "SKU": sku,
        "Source location": loc,
        "Task UOM Qty": 1, // Single unit
        "Executed By User": "GOLA Audit Bot",
        "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
        "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
    });
    cursorTime += 30000;
}

// Phase 2: Packing (Pack station, 30 separate jobs for each individual order)
// Wait, the user said: "SIBP is only for single items. lets create one job for all the single items and use engineered standards"
// Usually packing is order-discreet. I will assign one packing job code PER order.

for (let i = 1; i <= nofOrders; i++) {
    const sku = `SKU-SIBP-${i}`;
    const orderCode = `ORD-SIBP-${i}`;
    const packJobCode = `PACK-${orderCode}`;

    testData.push({
        "Job Type": "SIBP",
        "Wave Id": "WAVE-SIBP-1",
        "Job Code": packJobCode, // Discrete Job
        "Task Type": "Packing",
        "Order Code": orderCode,
        "SKU": sku,
        "Source location": "PACK-STATION",
        "Task UOM Qty": 1, // Single unit
        "Executed By User": "GOLA Audit Bot",
        "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
        "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
    });
    cursorTime += 30000;
}

// MATH:
// Picking
// OH: 1 Batch Job = 200s
// Locs: 15 visits * 13s = 195s
// SKUs: 30 visits * 17s = 510s
// Expected Pick total: 200 + 195 + 510 = 905s
const expectedPick = pickOh + (numLocs * pickLoc) + (numSkus * pickSku);

// Packing
// OH: 30 jobs * 10s = 300s
// Order: 30 orders * 32s = 960s
// Unit: 30 units * 4s = 120s
// Expected Pack total: 300 + 960 + 120 = 1380s
const expectedPack = (nofOrders * packOh) + (nofOrders * packOrder) + (nofOrders * packUnit);

const totalStandardSeconds = expectedPick + expectedPack; // 905 + 1380 = 2285s

const newScenario = {
    id: "SIBP-01",
    name: "SIBP Standards Audit",
    description: "Validates the Single Item Batch Pick happy path, calculating travel and pick times for a massive batch of single-item orders across shared locations, followed by individual packing.",
    category: "ENGINEERED_STANDARDS",
    environmentId: "JOB_ANALYZER_LOCAL",
    explanation: "Batch Pick Job Overhead applies ONCE. Location multipliers apply to unique locs. SKU multipliers apply to unique loc+sku. Packing applies individual overheads per order.",
    status: "IDLE",
    steps: [
        "Load SIBP single-item batch payload",
        "Parse into ShiftRecords",
        "Execute Happy Path Calculation",
        "Assert Final Standard Time matches Expected Results"
    ],
    expectedResults: { totalStandardSeconds },
    testData
};

const golaRaw = fs.readFileSync('./src/data/gola-audit-scenarios.json', 'utf8');
const gola = JSON.parse(golaRaw);
const idx = gola.findIndex((g: any) => g.id === 'SIBP-01');
if (idx > -1) {
    gola[idx] = newScenario;
} else {
    gola.push(newScenario);
}

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(gola, null, 4));

// Markdown output
let md = `# SIBP GOLA Payload: End-to-End Job Breakdown (Batch Pick + Per-Order Pack)\n\n`;
md += `This validates the SIBP GOLA test payload, combining ${nofOrders} single-item orders. The orders are picked in a **Single Giant Batch** across ${numLocs} distinct locations, then packed individually.\n\n`;

md += `## Baseline Multipliers (SIBP Picking)\n`;
md += `- **Job Overhead** (1x per BATCH): Job Init + Job Fin = **200s**\n`;
md += `- **Location Based** (1x per Location Visit): Travel Location (10s) + Scan Loc (3s) = **13s**\n`;
md += `- **SKU Base** (1x per Loc+SKU): Scan (3s) + Type Qty (4s) + Pick (10s) = **17s**\n`;

md += `\n## Baseline Multipliers (SIBP Packing)\n`;
md += `- **Job Overhead** (1x per Order): Pack Init = **10s**\n`;
md += `- **Order Base** (1x per Order): Box/Print/Close/Label/Put = **32s**\n`;
md += `- **Unit Variable** (1x per Unit): Scan/Put = **4s**\n\n`;

md += `## Aggregate Mathematical Validation\n\n`;

md += `| Phase | Overhead | Loc | SKU | Pack OH | Pack Order | Pack Unit | **Total Standard** |\n`;
md += `|---|---|---|---|---|---|---|---|\n`;
md += `| **PICKING** | 200s | 15 x 13s = 195s | 30 x 17s = 510s | 0 | 0 | 0 | **905s** |\n`;
md += `| **PACKING** | 0 | 0 | 0 | 30 x 10s = 300s | 30 x 32s = 960s | 30 x 4s = 120s | **1380s** |\n`;
md += `| **GRAND TOTAL** | -- | -- | -- | -- | -- | -- | **2285s** |\n\n`;

fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/sibp_detailed_breakdown.md', md);
fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/sibp_import_jobs.json', JSON.stringify(testData, null, 2));

console.log('Successfully generated SIBP-01 scenario, breakdown MD, and JSON export!');
