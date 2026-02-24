import fs from 'fs';

const configRaw = fs.readFileSync('./src/data/global-engineered-standards.json', 'utf8');
const config = { engineeredStandards: JSON.parse(configRaw) };

// Hardcoded based on JSON config values identified
const pickOh = 250;
const pickLoc = 48;
const pickSku = 14;
const pickLine = 3;

const packOh = 10;
const packOrder = 32;
const packUnit = 4;

const testData: any[] = [];
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();

// SCENARIO: Single item orders. 12 totes per cart. Each tote has only 1 SKU and all orders of that SKU.
// Meaning: 1 Cart = 1 Batch Job = 12 Totes.
// Let's create 1 Cart.
// Each tote = 1 SKU. So 12 SKUs total.
// "all the orders of that sku" -> Let's say we have 3 orders per SKU for demonstration (3 single item orders).
// Total Orders = 12 SKUs * 3 Orders = 36 Orders.
// Total Units = 36 Units.

const nofTotes = 12; // 1 Tote = 1 SKU
const ordersPerTote = 3; // Orders per SKU
const nofOrders = nofTotes * ordersPerTote;

const pickJobCode = "SICP-CART-001";

// Picking phase - 1 Continuous Job
for (let t = 1; t <= nofTotes; t++) {
    const sku = `SKU-SICP-${t}`;
    const loc = `LOC-SICP-${t}`;
    const toteCode = `TOTE-${t}`;

    for (let o = 1; o <= ordersPerTote; o++) {
        const orderCode = `ORD-${sku}-${o}`;

        testData.push({
            "Job Type": "SICP",
            "Wave Id": "WAVE-SICP-CART",
            "Job Code": pickJobCode,
            "Task Type": "Picking",
            "Order Code": orderCode,
            "SKU": sku,
            "Source location": loc,
            "Task UOM Qty": 1, // Single unit order
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

// Packing Phase - Individual jobs per Order
for (let t = 1; t <= nofTotes; t++) {
    const sku = `SKU-SICP-${t}`;

    for (let o = 1; o <= ordersPerTote; o++) {
        const orderCode = `ORD-${sku}-${o}`;
        const packJobCode = `PACK-${orderCode}`; // Pack operations are discrete per order

        testData.push({
            "Job Type": "SICP",
            "Wave Id": "WAVE-SICP-CART",
            "Job Code": packJobCode,
            "Task Type": "Packing",
            "Order Code": orderCode,
            "SKU": sku,
            "Source location": "PACK-STATION",
            "Task UOM Qty": 1,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

// Math calculation
// Picking:
// 1 Job Overhead = 250s
// 12 Locations = 12 * 48 = 576s
// 12 SKUs = 12 * 14 = 168s
// 36 Lines = 36 * 3 = 108s // Line Based is per task record (which represents 1 distinct order here) 
// Total Pick = 250 + 576 + 168 + 108 = 1102s
const expectedPick = 250 + (12 * 48) + (12 * 14) + (nofOrders * 3);

// Packing:
// Pack OH applied per unique job code? Yes, for Packing it's applied per JobCode (which here is mapped per Order).
// Wait, the standard variables:
// Job OH: 10s (per distinct Job Code, which we made 1 per order = 36 * 10 = 360s)
// Order Base: 32s (per distinct Order Code = 36 * 32 = 1152s)
// Unit Variable: 4s (per unit = 36 * 4 = 144s)
// Total Pack = 360 + 1152 + 144 = 1656s
const expectedPack = (nofOrders * 10) + (nofOrders * 32) + (nofOrders * 4);

const totalStandardSeconds = expectedPick + expectedPack; // 1102 + 1656 = 2758s

const newScenario = {
    id: "SICP-01",
    name: "SICP Standards Audit v2",
    description: "Validates SICP picking for 12 Totes (1 SKU per tote, 3 single-item orders per SKU), followed by discrete packing.",
    category: "ENGINEERED_STANDARDS",
    environmentId: "JOB_ANALYZER_LOCAL",
    explanation: "Cart-based picking calculates bulk OH, dynamic Loc/SKU multipliers. Packing calculates isolated OH and Order multipliers.",
    logic: "Batch Pick Job Overhead (250s). 12 Locs, 12 SKUs, 36 Lines. Packing OH/Order applied per discrete pack job (36 times).",
    status: "IDLE",
    steps: [
        "Load 12-Tote Cart SICP payload",
        "Parse into 36 Pick and 36 Pack ShiftRecords",
        "Execute Happy Path Calculation",
        "Assert Final Standard Time matches Expected Results"
    ],
    expectedResults: { totalStandardSeconds },
    testData
};

const golaRaw = fs.readFileSync('./src/data/gola-audit-scenarios.json', 'utf8');
const gola = JSON.parse(golaRaw);
const idx = gola.findIndex((g: any) => g.id === 'SICP-01');
if (idx > -1) {
    gola[idx] = newScenario;
} else {
    gola.push(newScenario);
}

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(gola, null, 4));

// Generate Markdown
let md = `# SICP GOLA Payload v2: End-to-End Job Breakdown (12-Tote Cart Batch Pick)\n\n`;
md += `This breakdown evaluates the SICP GOLA test payload representing **${nofOrders} single-item orders**. The orders are organized into **${nofTotes} Totes (1 Tote = 1 SKU)** with ${ordersPerTote} orders per SKU. All orders are picked via a **Single Picking Cart Job** and then packed individually.\n\n`;

md += `## Baseline Multipliers (SICP Picking)\n`;
md += `- **Job Overhead** (1x per Cart): Job Init + fin = **250s**\n`;
md += `- **Location Based** (1x per Location Visit): Travel Location (45s) + Scan Loc (3s) = **48s**\n`;
md += `- **SKU Base** (1x per Loc+SKU): Scan/Put = **14s**\n`;
md += `- **Line Based** (1x per Distinct Pick Task line): Scan Tote = **3s**\n`;

md += `\n## Baseline Multipliers (SICP Packing)\n`;
md += `- **Job Overhead** (1x per Pack Job): Pack Init = **10s**\n`;
md += `- **Order Base** (1x per Order): Box Ops = **32s**\n`;
md += `- **Unit Variable** (1x per Unit): Item Handling = **4s**\n\n`;

md += `## Aggregate Mathematical Validation\n\n`;

md += `| Phase | Overhead | Loc | SKU | Line  | Pack OH | Pack Order | Pack Unit | **Total Standard** |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
md += `| **PICKING** | 250s | 12 x 48s = 576s | 12 x 14s = 168s | 36 x 3s = 108s | 0 | 0 | 0 | **1102s** |\n`;
md += `| **PACKING** | 0 | 0 | 0 | 0 | 36 x 10s = 360s | 36 x 32s = 1152s | 36 x 4s = 144s | **1656s** |\n`;
md += `| **GRAND TOTAL** | -- | -- | -- | -- | -- | -- | -- | **2758s** |\n\n`;

fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/sicp_v2_detailed_breakdown.md', md);
fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/sicp_v2_import_jobs.json', JSON.stringify(testData, null, 2));

console.log('Successfully generated SICP-01 v2 scenario, breakdown MD, and JSON export!');
