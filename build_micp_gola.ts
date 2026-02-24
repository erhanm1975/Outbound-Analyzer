import fs from 'fs';

const pickingMicp = {
    jobOh: 150 + 100, // 250
    locBase: 45 + 3, // 48
    skuBase: 3 + 4 + 7, // 14
    lineBase: 3 // 3
};

const packingMicp = {
    jobOh: 10, // 10
    orderBase: 5 + 2 + 10 + 5 + 1 + 4 + 2 + 3, // 32
    unitVar: 2 + 2 // 4
};

const testData: any[] = [];
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();

// We will create 2 jobs to test the 12 tote cart max correctly.
// Job 1: 12 orders
// Job 2: 8 orders
// Every order will contain 2 lines (Line 1: 3 units, Line 2: 2 units) = 5 units per order.
// Total 20 orders, 40 lines, 100 units.

const jobs = [
    { code: 'MICP-BATCH-001', numOrders: 12, startOffset: 0 },
    { code: 'MICP-BATCH-002', numOrders: 8, startOffset: 12 }
];

let globalLines = 0;

for (const job of jobs) {
    // Generate Picks for the job
    for (let i = 1; i <= job.numOrders; i++) {
        const orderId = job.startOffset + i;

        // Line 1 for Order
        testData.push({
            "Job Type": "MICP",
            "Wave Id": "WAVE-MICP-1",
            "Job Code": job.code,
            "Task Type": "Picking",
            "Order Code": `ORD-MICP-${orderId}`,
            "SKU": `SKU-A-${orderId}`,
            "Source location": `LOC-A-${orderId}`,
            "Task UOM Qty": 3,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
        globalLines++;

        // Line 2 for Order
        testData.push({
            "Job Type": "MICP",
            "Wave Id": "WAVE-MICP-1",
            "Job Code": job.code,
            "Task Type": "Picking",
            "Order Code": `ORD-MICP-${orderId}`,
            "SKU": `SKU-B-${orderId}`,
            "Source location": `LOC-B-${orderId}`,
            "Task UOM Qty": 2,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
        globalLines++;
    }
}

// Generate Packs
for (const job of jobs) {
    for (let i = 1; i <= job.numOrders; i++) {
        const orderId = job.startOffset + i;

        // Pack task for Line 1
        testData.push({
            "Job Type": "MICP",
            "Wave Id": "WAVE-MICP-1",
            "Job Code": job.code,
            "Task Type": "Packing",
            "Order Code": `ORD-MICP-${orderId}`,
            "SKU": `SKU-A-${orderId}`,
            "Source location": `PACK-STATION`,
            "Task UOM Qty": 3,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;

        // Pack task for Line 2
        testData.push({
            "Job Type": "MICP",
            "Wave Id": "WAVE-MICP-1",
            "Job Code": job.code,
            "Task Type": "Packing",
            "Order Code": `ORD-MICP-${orderId}`,
            "SKU": `SKU-B-${orderId}`,
            "Source location": `PACK-STATION`,
            "Task UOM Qty": 2,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

// Math logic:
const nofJobs = 2;
const nofOrders = 20;

const pickLines = testData.filter(d => d['Task Type'] === 'Picking');
const packLines = testData.filter(d => d['Task Type'] === 'Packing');

const locs = new Set(pickLines.map(d => d['Source location'])).size; // 40 locs
const skus = new Set(pickLines.map(d => `${d['Source location']}|${d['SKU']}`)).size; // 40 loc+skus
const numLines = pickLines.length; // 40 lines
const units = packLines.reduce((acc, current) => acc + current['Task UOM Qty'], 0); // 100 units

// Picking:
const expectedPickJOH = nofJobs * pickingMicp.jobOh; // 2 * 250 = 500
const expectedPickLoc = locs * pickingMicp.locBase; // 40 * 48 = 1920
const expectedPickSku = skus * pickingMicp.skuBase; // 40 * 14 = 560
const expectedPickLine = numLines * pickingMicp.lineBase; // 40 * 3 = 120
const expectedPick = expectedPickJOH + expectedPickLoc + expectedPickSku + expectedPickLine; // 3100

// Packing:
const expectedPackJOH = nofOrders * packingMicp.jobOh; // 20 * 10 = 200
const expectedPackOB = nofOrders * packingMicp.orderBase; // 20 * 32 = 640
const expectedPackUV = units * packingMicp.unitVar; // 100 * 4 = 400
const expectedPack = expectedPackJOH + expectedPackOB + expectedPackUV; // 1240

const totalStandardSeconds = expectedPick + expectedPack; // 4340

const newScenario = {
    id: "MICP-01",
    name: "MICP Multi-Item Standards Audit",
    description: "Validates calculation for MICP multi-item cart picking. Contains 2 pick jobs (12 cart limit) with a total of 20 orders, 40 lines, 100 units.",
    category: "ENGINEERED_STANDARDS",
    environmentId: "JOB_ANALYZER_LOCAL",
    explanation: "Ensures Pick Job Overhead is correctly applied twice (2 jobs), while packing overhead and base metrics are applied per order (20 orders).",
    logic: "Batch Job OH x2. Unique Loc/SKU multipliers. Order base multipliers per discrete order.",
    status: "IDLE",
    steps: [
        "Load static MICP payload",
        "Parse into ShiftRecords",
        "Execute Happy Path Calculation",
        "Assert Final Standard Time matches Expected Results"
    ],
    expectedResults: { totalStandardSeconds },
    testData
};

const golaRaw = fs.readFileSync('./src/data/gola-audit-scenarios.json', 'utf8');
const gola = JSON.parse(golaRaw);
const idx = gola.findIndex(g => g.id === 'MICP-01');
if (idx > -1) {
    gola[idx] = newScenario;
} else {
    gola.push(newScenario);
}

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(gola, null, 4));

// Generate Markdown summary
let md = `# MICP GOLA Payload: End-to-End Job Breakdown\n\n`;
md += `Payload consists of **${nofJobs} Batches (Jobs)** spanning **${nofOrders} Orders**, with **${numLines} Lines** and **${units} Total Units**.\n\n`;

md += `## Baseline Multipliers (MICP Picking)\n`;
md += `- **Job Overhead** (1x per BATCH): Job Init + Job Fin = **250s**\n`;
md += `- **Location Based** (1x per Location Visit): Travel Location (45s) + Scan Loc (3s) = **48s**\n`;
md += `- **SKU Base** (1x per Loc+SKU): Scan (3s) + Type Qty (4s) + Pick (7s) = **14s**\n`;
md += `- **Line Based** (1x per Line): Scan Tote = **3s**\n`;

md += `\n## Baseline Multipliers (MICP Packing)\n`;
md += `- **Job Overhead** (1x per Order): Pack Init = **10s**\n`;
md += `- **Order Base** (1x per Order): Box/Print/Close/Label/Put = **32s**\n`;
md += `- **Unit Variable** (1x per Unit): Scan/Put = **4s**\n\n`;

md += `## Aggregate Mathematical Validation\n\n`;

md += `| Phase | Overhead | Loc | SKU | Line  | Pack OH | Pack Order | Pack Unit | **Total Standard** |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
md += `| **PICKING** | 2 x 250s = 500s | 40 x 48s = 1920s | 40 x 14s = 560s | 40 x 3s = 120s | 0 | 0 | 0 | **${expectedPick}s** |\n`;
md += `| **PACKING** | 0 | 0 | 0 | 0 | 20 x 10s = 200s | 20 x 32s = 640s | 100 x 4s = 400s | **${expectedPack}s** |\n`;
md += `| **GRAND TOTAL** | -- | -- | -- | -- | -- | -- | -- | **${totalStandardSeconds}s** |\n\n`;

fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/micp_detailed_breakdown.md', md);
fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/micp_import_jobs.json', JSON.stringify(testData, null, 2));

console.log('Successfully generated MICP-01 scenario, breakdown MD, and JSON export!');
