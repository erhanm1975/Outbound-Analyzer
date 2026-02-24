import fs from 'fs';

const pickingIobp = {
    jobOh: 100 + 100, // 200
    locBase: 45 + 3, // 48
    skuBase: 3 + 4 + 10, // 17
    lineBase: 0 // 0
};

const packingIobp = {
    jobOh: 10, // 10
    orderBase: 5 + 2 + 10 + 5 + 1 + 4 + 2 + 3, // 32
    unitVar: 2 + 2 // 4
};

const testData: any[] = [];
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();

// "if there are multiple orders with same sku+unit combination than put them in the same job."
const combinations = [
    { sku: 'SKU-A', qty: 2, numOrders: 5, loc: 'LOC-A', job: 'IOBP-BATCH-1' },
    { sku: 'SKU-B', qty: 3, numOrders: 4, loc: 'LOC-B', job: 'IOBP-BATCH-2' },
    { sku: 'SKU-C', qty: 1, numOrders: 1, loc: 'LOC-C', job: 'IOBP-BATCH-3' }, // Unique order
    { sku: 'SKU-D', qty: 5, numOrders: 2, loc: 'LOC-D', job: 'IOBP-BATCH-4' }
];

let orderIdCounter = 1;

for (const combo of combinations) {
    for (let i = 0; i < combo.numOrders; i++) {
        const orderCode = `ORD-IOBP-${orderIdCounter++}`;

        // Picking Task
        testData.push({
            "Job Type": "IOBP",
            "Wave Id": "WAVE-IOBP-1",
            "Job Code": combo.job,
            "Task Type": "Picking",
            "Order Code": orderCode,
            "SKU": combo.sku,
            "Source location": combo.loc,
            "Task UOM Qty": combo.qty,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

// Generate Packing tasks
orderIdCounter = 1;

for (const combo of combinations) {
    for (let i = 0; i < combo.numOrders; i++) {
        const orderCode = `ORD-IOBP-${orderIdCounter++}`;

        // Packing Task
        testData.push({
            "Job Type": "IOBP",
            "Wave Id": "WAVE-IOBP-1",
            "Job Code": combo.job,
            "Task Type": "Packing",
            "Order Code": orderCode,
            "SKU": combo.sku,
            "Source location": `PACK-STATION`,
            "Task UOM Qty": combo.qty,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

const pickLines = testData.filter(d => d['Task Type'] === 'Picking');
const packLines = testData.filter(d => d['Task Type'] === 'Packing');

const nofJobs = new Set(pickLines.map(d => d['Job Code'])).size; // 4 jobs
const locs = new Set(pickLines.map(d => d['Source location'])).size; // 4 locs
const skusCombinations = new Set(pickLines.map(d => `${d['Source location']}|${d['SKU']}`)).size; // 4 loc+skus
const numLines = pickLines.length; // 12 lines
const nofOrders = new Set(packLines.map(d => d['Order Code'])).size; // 12 orders
const units = packLines.reduce((acc, current) => acc + current['Task UOM Qty'], 0); // 33 units

const expectedPickJOH = nofJobs * pickingIobp.jobOh; // 4 * 200 = 800
const expectedPickLoc = locs * pickingIobp.locBase; // 4 * 48 = 192
const expectedPickSku = skusCombinations * pickingIobp.skuBase; // 4 * 17 = 68
const expectedPickLine = numLines * pickingIobp.lineBase; // 12 * 0 = 0
const expectedPick = expectedPickJOH + expectedPickLoc + expectedPickSku + expectedPickLine; // 1060

const expectedPackJOH = nofOrders * packingIobp.jobOh; // 12 * 10 = 120
const expectedPackOB = nofOrders * packingIobp.orderBase; // 12 * 32 = 384
const expectedPackUV = units * packingIobp.unitVar; // 33 * 4 = 132
const expectedPack = expectedPackJOH + expectedPackOB + expectedPackUV; // 636

const totalStandardSeconds = expectedPick + expectedPack; // 1696

const newScenario = {
    id: "IOBP-01",
    name: "IOBP Identical Order Batch Profiling",
    description: "Validates calculation for IOBP identical-order batching. Orders with the exact same SKU+Qty combination are grouped into a single picking job. Unique orders become their own job.",
    category: "ENGINEERED_STANDARDS",
    environmentId: "JOB_ANALYZER_LOCAL",
    explanation: "Job Overhead is isolated per unique SKU+Qty combination.",
    logic: "Job = Identical SKU+Qty combination across orders.",
    status: "IDLE",
    steps: [
        "Load static IOBP payload",
        "Parse into ShiftRecords",
        "Execute Happy Path Calculation",
        "Assert Final Standard Time matches Expected Results"
    ],
    expectedResults: { totalStandardSeconds },
    testData
};

const golaRaw = fs.readFileSync('./src/data/gola-audit-scenarios.json', 'utf8');
const gola = JSON.parse(golaRaw);
const idx = gola.findIndex(g => g.id === 'IOBP-01');
if (idx > -1) {
    gola[idx] = newScenario;
} else {
    gola.push(newScenario);
}

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(gola, null, 4));

let md = `# IOBP GOLA Payload: End-to-End Job Breakdown (Identical Order Profiles)\n\n`;
md += `Payload consists of **${nofJobs} Batch Jobs** mapping uniquely to Identical SKU+Quantity combinations. Aggregating **${nofOrders} Orders**, **${numLines} Lines**, and **${units} Units**.\n\n`;

md += `## Baseline Multipliers (IOBP Picking)\n`;
md += `- **Job Overhead** (1x per Identical Combination Job): Job Init (100) + Job Fin (100) = **200s**\n`;
md += `- **Location Based** (1x per Location Visit): Travel Location (45) + Scan Loc (3) = **48s**\n`;
md += `- **SKU Base** (1x per Loc+SKU): Scan (3) + Type (4) + Pick (10) = **17s**\n`;
md += `- **Line Based** (1x per Line): Scan Tote = **0s**\n`;

md += `\n## Baseline Multipliers (IOBP Packing)\n`;
md += `- **Job Overhead** (1x per Order): Pack Init = **10s**\n`;
md += `- **Order Base** (1x per Order): Box/Print/Label/Put = **32s**\n`;
md += `- **Unit Variable** (1x per Unit): Scan/Put = **4s**\n\n`;

md += `## Aggregate Mathematical Validation\n\n`;

md += `| Phase | Overhead | Loc | SKU | Line  | Pack OH | Pack Order | Pack Unit | **Total Standard** |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
md += `| **PICKING** | ${nofJobs} x 200s = ${expectedPickJOH}s | ${locs} x 48s = ${expectedPickLoc}s | ${skusCombinations} x 17s = ${expectedPickSku}s | ${numLines} x 0s = 0s | 0 | 0 | 0 | **${expectedPick}s** |\n`;
md += `| **PACKING** | 0 | 0 | 0 | 0 | ${nofOrders} x 10s = ${expectedPackJOH}s | ${nofOrders} x 32s = ${expectedPackOB}s | ${units} x 4s = ${expectedPackUV}s | **${expectedPack}s** |\n`;
md += `| **GRAND TOTAL** | -- | -- | -- | -- | -- | -- | -- | **${totalStandardSeconds}s** |\n\n`;

fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/iobp_detailed_breakdown.md', md);
fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/iobp_import_jobs.json', JSON.stringify(testData, null, 2));

console.log('Successfully generated IOBP-01 scenario, breakdown MD, and JSON export!');
