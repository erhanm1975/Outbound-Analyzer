import fs from 'fs';

const pickingIibp = {
    jobOh: 100 + 100, // 200
    locBase: 40 + 3, // 43
    skuBase: 3 + 4 + 10, // 17
    lineBase: 0 // 0
};

const packingIibp = {
    jobOh: 10, // 10
    orderBase: 5 + 2 + 10 + 5 + 1 + 4 + 2 + 3, // 32
    unitVar: 2 + 2 // 4
};

const testData: any[] = [];
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();

const nofSkus = 5;
const ordersPerSku = 6;
const totalOrders = nofSkus * ordersPerSku;

// Generate Picking: 1 Job per SKU
// All single item orders -> each order is just 1 unit of that SKU
for (let s = 1; s <= nofSkus; s++) {
    const jobCode = `IIBP-SKU-${s}`;
    const skuCode = `SKU-X-${s}`;
    const locCode = `LOC-X-${s}`;

    // Create pick tasks
    for (let o = 1; o <= ordersPerSku; o++) {
        const orderId = (s - 1) * ordersPerSku + o;
        testData.push({
            "Job Type": "IIBP",
            "Wave Id": "WAVE-IIBP-1",
            "Job Code": jobCode,
            "Task Type": "Picking",
            "Order Code": `ORD-IIBP-${orderId}`,
            "SKU": skuCode,
            "Source location": locCode,
            "Task UOM Qty": 1,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

// Generate Packing: same job code or different?
// "all the orders belonging that sku is a job." -> Keep Job Code identical
for (let s = 1; s <= nofSkus; s++) {
    const jobCode = `IIBP-SKU-${s}`;
    const skuCode = `SKU-X-${s}`;

    for (let o = 1; o <= ordersPerSku; o++) {
        const orderId = (s - 1) * ordersPerSku + o;
        testData.push({
            "Job Type": "IIBP",
            "Wave Id": "WAVE-IIBP-1",
            "Job Code": jobCode, // Key logic requirement
            "Task Type": "Packing",
            "Order Code": `ORD-IIBP-${orderId}`,
            "SKU": skuCode,
            "Source location": `PACK-STATION`,
            "Task UOM Qty": 1,
            "Executed By User": "GOLA Audit Bot",
            "Start Date": new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19),
            "Finish Date": new Date(cursorTime + 30000).toISOString().replace('T', ' ').substring(0, 19)
        });
        cursorTime += 30000;
    }
}

// Math verification
const pickLines = testData.filter(d => d['Task Type'] === 'Picking');
const packLines = testData.filter(d => d['Task Type'] === 'Packing');

const nofJobs = new Set(pickLines.map(d => d['Job Code'])).size; // 5 jobs
const locs = new Set(pickLines.map(d => d['Source location'])).size; // 5 locs
const skusCombinations = new Set(pickLines.map(d => `${d['Source location']}|${d['SKU']}`)).size; // 5 loc+skus
const numLines = pickLines.length; // 30 lines
const units = packLines.reduce((acc, current) => acc + current['Task UOM Qty'], 0); // 30 units

const expectedPickJOH = nofJobs * pickingIibp.jobOh; // 5 * 200 = 1000
const expectedPickLoc = locs * pickingIibp.locBase; // 5 * 43 = 215
const expectedPickSku = skusCombinations * pickingIibp.skuBase; // 5 * 17 = 85
const expectedPickLine = numLines * pickingIibp.lineBase; // 30 * 0 = 0
const expectedPick = expectedPickJOH + expectedPickLoc + expectedPickSku + expectedPickLine; // 1300

const expectedPackJOH = totalOrders * packingIibp.jobOh; // 30 * 10 = 300
const expectedPackOB = totalOrders * packingIibp.orderBase; // 30 * 32 = 960
const expectedPackUV = units * packingIibp.unitVar; // 30 * 4 = 120
const expectedPack = expectedPackJOH + expectedPackOB + expectedPackUV; // 1380

const totalStandardSeconds = expectedPick + expectedPack; // 2680

const newScenario = {
    id: "IIBP-01",
    name: "IIBP Item-Based Flow Audit",
    description: "Validates calculation for IIBP Single-Item profiling. Jobs are isolated entirely by distinct SKU. Each SKU forms 1 picking job containing multiple single-unit orders.",
    category: "ENGINEERED_STANDARDS",
    environmentId: "JOB_ANALYZER_LOCAL",
    explanation: "Job Overhead is applied per unique SKU logic. Pack overhead applies discretely per order.",
    logic: "Job = 1 Unique SKU. Packing is order-based.",
    status: "IDLE",
    steps: [
        "Load static IIBP payload",
        "Parse into ShiftRecords",
        "Execute Happy Path Calculation",
        "Assert Final Standard Time matches Expected Results"
    ],
    expectedResults: { totalStandardSeconds },
    testData
};

const golaRaw = fs.readFileSync('./src/data/gola-audit-scenarios.json', 'utf8');
const gola = JSON.parse(golaRaw);
const idx = gola.findIndex(g => g.id === 'IIBP-01');
if (idx > -1) {
    gola[idx] = newScenario;
} else {
    gola.push(newScenario);
}

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(gola, null, 4));

let md = `# IIBP GOLA Payload: End-to-End Job Breakdown (SKU-Bound)\n\n`;
md += `Payload consists of **${nofJobs} Unique SKU Jobs**, aggregating **${totalOrders} Total Orders** (1 item per order). Total **${units} Units**.\n\n`;

md += `## Baseline Multipliers (IIBP Picking)\n`;
md += `- **Job Overhead** (1x per SKU Job): Job Init (100) + Job Fin (100) = **200s**\n`;
md += `- **Location Based** (1x per Location Visit): Travel Location (40) + Scan Loc (3) = **43s**\n`;
md += `- **SKU Base** (1x per Loc+SKU): Scan (3) + Type (4) + Pick (10) = **17s**\n`;
md += `- **Line Based** (1x per Line): Scan Tote = **0s**\n`;

md += `\n## Baseline Multipliers (IIBP Packing)\n`;
md += `- **Job Overhead** (1x per Order): Pack Init = **10s**\n`;
md += `- **Order Base** (1x per Order): Box/Print/Label/Put = **32s**\n`;
md += `- **Unit Variable** (1x per Unit): Scan/Put = **4s**\n\n`;

md += `## Aggregate Mathematical Validation\n\n`;

md += `| Phase | Overhead | Loc | SKU | Line  | Pack OH | Pack Order | Pack Unit | **Total Standard** |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
md += `| **PICKING** | ${nofJobs} x 200s = ${expectedPickJOH}s | ${locs} x 43s = ${expectedPickLoc}s | ${skusCombinations} x 17s = ${expectedPickSku}s | ${numLines} x 0s = 0s | 0 | 0 | 0 | **${expectedPick}s** |\n`;
md += `| **PACKING** | 0 | 0 | 0 | 0 | ${totalOrders} x 10s = ${expectedPackJOH}s | ${totalOrders} x 32s = ${expectedPackOB}s | ${units} x 4s = ${expectedPackUV}s | **${expectedPack}s** |\n`;
md += `| **GRAND TOTAL** | -- | -- | -- | -- | -- | -- | -- | **${totalStandardSeconds}s** |\n\n`;

fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/iibp_detailed_breakdown.md', md);
fs.writeFileSync('/Users/erhanmusaoglu/.gemini/antigravity/brain/a26063d8-230c-4548-a9ab-8d488825aea7/iibp_import_jobs.json', JSON.stringify(testData, null, 2));

console.log('Successfully generated IIBP-01 scenario, breakdown MD, and JSON export!');
