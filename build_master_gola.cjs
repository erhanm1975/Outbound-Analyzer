// build_master_gola.cjs
// Master GOLA Generator: Reads the golden dataset and engineered standards,
// then generates all 7 GOLA scenarios with mathematically derived expectations.
//
// MANDATE: .agents/workflows/gola-engineered-standards.md
// DATA SOURCE: src/data/GOLA-Audit-Order-List.json (NEVER modify)

const fs = require('fs');

// ===== LOAD GOLDEN DATASET =====
const goldenRaw = JSON.parse(fs.readFileSync('./src/data/GOLA-Audit-Order-List.json', 'utf8'));
const allLines = goldenRaw.Sheet1;

// ===== LOAD ENGINEERED STANDARDS =====
const standards = JSON.parse(fs.readFileSync('./src/data/global-engineered-standards.json', 'utf8'));

function getCard(id) {
    return standards.cards.find(c => c.id === id);
}

function sumBucket(card, bucket) {
    return card.activities
        .filter(a => a.bucket === bucket)
        .reduce((acc, a) => acc + a.defaultSeconds, 0);
}

// ===== STANDARD MULTIPLIERS (derived from JSON, not hardcoded) =====
const std = {
    obpp: {
        pickOH: sumBucket(getCard('picking_obpp'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_obpp'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_obpp'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_obpp'), 'Line Based'),
        packOH: sumBucket(getCard('packing_obpp'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_obpp'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_obpp'), 'Unit Variable'),
    },
    putw: {
        pickOH: sumBucket(getCard('picking_putwall'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_putwall'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_putwall'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_putwall'), 'Line Based'),
        sortOH: sumBucket(getCard('sorting_putwall'), 'Job Overhead'),
        sortSKU: sumBucket(getCard('sorting_putwall'), 'SKU Base'),
        sortLine: sumBucket(getCard('sorting_putwall'), 'Line Based'),
        packOH: sumBucket(getCard('packing_putwall'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_putwall'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_putwall'), 'Unit Variable'),
    },
    sicp: {
        pickOH: sumBucket(getCard('picking_sicp'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_sicp'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_sicp'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_sicp'), 'Line Based'),
        packOH: sumBucket(getCard('packing_sicp'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_sicp'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_sicp'), 'Unit Variable'),
    },
    micp: {
        pickOH: sumBucket(getCard('picking_micp'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_micp'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_micp'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_micp'), 'Line Based'),
        packOH: sumBucket(getCard('packing_micp'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_micp'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_micp'), 'Unit Variable'),
    },
    sibp: {
        pickOH: sumBucket(getCard('picking_sibp'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_sibp'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_sibp'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_sibp'), 'Line Based'),
        packOH: sumBucket(getCard('packing_sibp'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_sibp'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_sibp'), 'Unit Variable'),
    },
    iibp: {
        pickOH: sumBucket(getCard('picking_iibp'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_iibp'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_iibp'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_iibp'), 'Line Based'),
        packOH: sumBucket(getCard('packing_iibp'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_iibp'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_iibp'), 'Unit Variable'),
    },
    iobp: {
        pickOH: sumBucket(getCard('picking_iobp'), 'Job Overhead'),
        pickLoc: sumBucket(getCard('picking_iobp'), 'Location Based'),
        pickSKU: sumBucket(getCard('picking_iobp'), 'SKU Base'),
        pickLine: sumBucket(getCard('picking_iobp'), 'Line Based'),
        packOH: sumBucket(getCard('packing_iobp'), 'Job Overhead'),
        packOrder: sumBucket(getCard('packing_iobp'), 'Order Base'),
        packUnit: sumBucket(getCard('packing_iobp'), 'Unit Variable'),
    },
};

console.log('=== Derived Standard Multipliers ===');
for (const [k, v] of Object.entries(std)) {
    console.log(`${k}:`, JSON.stringify(v));
}

// ===== GROUP LINES BY ORDER =====
const orderMap = {};
for (const line of allLines) {
    if (!orderMap[line.Order]) orderMap[line.Order] = [];
    orderMap[line.Order].push(line);
}
const allOrderIds = Object.keys(orderMap);

// Single-item filter
const singleItemOrderIds = allOrderIds.filter(id => {
    const lines = orderMap[id];
    return lines.length === 1 && lines[0].Units === 1;
});

console.log(`\nTotal orders: ${allOrderIds.length}, Single-item: ${singleItemOrderIds.length}`);

// ===== HELPERS =====
let cursorTime = new Date('2026-02-22T10:00:00Z').getTime();
function nextTime() {
    const t = new Date(cursorTime).toISOString().replace('T', ' ').substring(0, 19);
    cursorTime += 30000;
    return t;
}
function resetCursor() { cursorTime = new Date('2026-02-22T10:00:00Z').getTime(); }

function makeRow(jobType, waveId, jobCode, taskType, orderCode, sku, loc, qty) {
    const start = nextTime();
    const finish = nextTime();
    return {
        "Job Type": jobType, "Wave Id": waveId, "Job Code": jobCode,
        "Task Type": taskType, "Order Code": orderCode, "SKU": sku,
        "Source location": loc, "Task UOM Qty": qty,
        "Executed By User": "GOLA Audit Bot", "Start Date": start, "Finish Date": finish
    };
}

// ================================================================
// SCENARIO 1: OBPP — 1 Job per Order
// ================================================================
resetCursor();
const obppData = [];
for (const orderId of allOrderIds) {
    const lines = orderMap[orderId];
    for (const line of lines) {
        obppData.push(makeRow('OBPP', 'WAVE-OBPP-1', orderId, 'Picking', orderId, line.SKU, line.Location, line.Units));
        obppData.push(makeRow('OBPP', 'WAVE-OBPP-1', orderId, 'Packing', orderId, line.SKU, 'PACK-STATION', line.Units));
    }
}
// Math: Per order -> OH once, Locs per order, SKU combos per order
let obppPick = 0;
let obppPack = 0;
for (const orderId of allOrderIds) {
    const lines = orderMap[orderId];
    const locs = new Set(lines.map(l => l.Location)).size;
    const locSkus = new Set(lines.map(l => `${l.Location}|${l.SKU}`)).size;
    const units = lines.reduce((a, l) => a + l.Units, 0);
    obppPick += std.obpp.pickOH + (locs * std.obpp.pickLoc) + (locSkus * std.obpp.pickSKU);
    obppPack += std.obpp.packOH + std.obpp.packOrder + (units * std.obpp.packUnit);
}
const obppTotal = obppPick + obppPack;

// ================================================================
// SCENARIO 2: PUTW — 1 Batch Pick, 1 Sort, 25 Pack
// ================================================================
resetCursor();
const putwData = [];
// Phase 1: Picking
for (const orderId of allOrderIds) {
    for (const line of orderMap[orderId]) {
        putwData.push(makeRow('PUTW', 'WAVE-PUTW-1', 'BATCH-PUTW-1', 'Picking', orderId, line.SKU, line.Location, line.Units));
    }
}
// Phase 2: Sorting (1 row per unit)
for (const orderId of allOrderIds) {
    for (const line of orderMap[orderId]) {
        for (let u = 0; u < line.Units; u++) {
            putwData.push(makeRow('PUTW', 'WAVE-PUTW-1', 'SORT-PUTW-1', 'Sort Item', orderId, line.SKU, 'SORT-WALL', 1));
        }
    }
}
// Phase 3: Packing (1 job per order)
for (const orderId of allOrderIds) {
    const lines = orderMap[orderId];
    for (const line of lines) {
        putwData.push(makeRow('PUTW', 'WAVE-PUTW-1', `PACK-${orderId}`, 'Packing', orderId, line.SKU, 'PACK-STATION', line.Units));
    }
}
// Math
const putwGlobalLocs = new Set(allLines.map(l => l.Location)).size;
const putwGlobalLocSkus = new Set(allLines.map(l => `${l.Location}|${l.SKU}`)).size;
const putwTotalUnits = allLines.reduce((a, l) => a + l.Units, 0);
const putwPickTotal = std.putw.pickOH + (putwGlobalLocs * std.putw.pickLoc) + (putwGlobalLocSkus * std.putw.pickSKU);
const putwSortTotal = std.putw.sortOH + (putwTotalUnits * std.putw.sortSKU) + (putwTotalUnits * std.putw.sortLine);
let putwPackTotal = 0;
for (const orderId of allOrderIds) {
    const units = orderMap[orderId].reduce((a, l) => a + l.Units, 0);
    putwPackTotal += std.putw.packOH + std.putw.packOrder + (units * std.putw.packUnit);
}
const putwTotal = putwPickTotal + putwSortTotal + putwPackTotal;

// ================================================================
// SCENARIO 3: MICP — Carts of max 12 orders
// ================================================================
resetCursor();
const micpData = [];
const micpCarts = [];
for (let i = 0; i < allOrderIds.length; i += 12) {
    micpCarts.push(allOrderIds.slice(i, i + 12));
}
// Picking
for (let ci = 0; ci < micpCarts.length; ci++) {
    const cart = micpCarts[ci];
    const jobCode = `MICP-CART-${ci + 1}`;
    for (const orderId of cart) {
        for (const line of orderMap[orderId]) {
            micpData.push(makeRow('MICP', 'WAVE-MICP-1', jobCode, 'Picking', orderId, line.SKU, line.Location, line.Units));
        }
    }
}
// Packing (1 job per order)
for (const orderId of allOrderIds) {
    for (const line of orderMap[orderId]) {
        micpData.push(makeRow('MICP', 'WAVE-MICP-1', `PACK-${orderId}`, 'Packing', orderId, line.SKU, 'PACK-STATION', line.Units));
    }
}
// Math
let micpPickTotal = 0;
for (const cart of micpCarts) {
    const cartLines = cart.flatMap(id => orderMap[id]);
    const locs = new Set(cartLines.map(l => l.Location)).size;
    const locSkus = new Set(cartLines.map(l => `${l.Location}|${l.SKU}`)).size;
    const lines = cartLines.length;
    micpPickTotal += std.micp.pickOH + (locs * std.micp.pickLoc) + (locSkus * std.micp.pickSKU) + (lines * std.micp.pickLine);
}
let micpPackTotal = 0;
for (const orderId of allOrderIds) {
    const units = orderMap[orderId].reduce((a, l) => a + l.Units, 0);
    micpPackTotal += std.micp.packOH + std.micp.packOrder + (units * std.micp.packUnit);
}
const micpTotal = micpPickTotal + micpPackTotal;

// ================================================================
// SCENARIO 4: SICP — Single-item only, 1 Cart, max 12 totes (1 SKU/tote)
// ================================================================
resetCursor();
const sicpData = [];
const sicpLines = singleItemOrderIds.flatMap(id => orderMap[id]);
const sicpJobCode = 'SICP-CART-1';
// Picking
for (const orderId of singleItemOrderIds) {
    for (const line of orderMap[orderId]) {
        sicpData.push(makeRow('SICP', 'WAVE-SICP-1', sicpJobCode, 'Picking', orderId, line.SKU, line.Location, line.Units));
    }
}
// Packing (1 job per order)
for (const orderId of singleItemOrderIds) {
    for (const line of orderMap[orderId]) {
        sicpData.push(makeRow('SICP', 'WAVE-SICP-1', `PACK-${orderId}`, 'Packing', orderId, line.SKU, 'PACK-STATION', line.Units));
    }
}
// Math: 1 cart job
const sicpLocs = new Set(sicpLines.map(l => l.Location)).size;
const sicpLocSkus = new Set(sicpLines.map(l => `${l.Location}|${l.SKU}`)).size;
const sicpNofLines = sicpLines.length;
const sicpNofOrders = singleItemOrderIds.length;
const sicpTotalUnits = sicpLines.reduce((a, l) => a + l.Units, 0);
const sicpPickTotal = std.sicp.pickOH + (sicpLocs * std.sicp.pickLoc) + (sicpLocSkus * std.sicp.pickSKU) + (sicpNofLines * std.sicp.pickLine);
let sicpPackTotal = 0;
for (const orderId of singleItemOrderIds) {
    const units = orderMap[orderId].reduce((a, l) => a + l.Units, 0);
    sicpPackTotal += std.sicp.packOH + std.sicp.packOrder + (units * std.sicp.packUnit);
}
const sicpTotal = sicpPickTotal + sicpPackTotal;

// ================================================================
// SCENARIO 5: SIBP — Single-item only, 1 giant batch pick
// ================================================================
resetCursor();
const sibpData = [];
const sibpLines = singleItemOrderIds.flatMap(id => orderMap[id]);
const sibpJobCode = 'SIBP-BATCH-1';
// Picking
for (const orderId of singleItemOrderIds) {
    for (const line of orderMap[orderId]) {
        sibpData.push(makeRow('SIBP', 'WAVE-SIBP-1', sibpJobCode, 'Picking', orderId, line.SKU, line.Location, line.Units));
    }
}
// Packing
for (const orderId of singleItemOrderIds) {
    for (const line of orderMap[orderId]) {
        sibpData.push(makeRow('SIBP', 'WAVE-SIBP-1', `PACK-${orderId}`, 'Packing', orderId, line.SKU, 'PACK-STATION', line.Units));
    }
}
// Math: 1 batch job
const sibpLocs = new Set(sibpLines.map(l => l.Location)).size;
const sibpLocSkus = new Set(sibpLines.map(l => `${l.Location}|${l.SKU}`)).size;
const sibpPickTotal = std.sibp.pickOH + (sibpLocs * std.sibp.pickLoc) + (sibpLocSkus * std.sibp.pickSKU);
let sibpPackTotal = 0;
for (const orderId of singleItemOrderIds) {
    const units = orderMap[orderId].reduce((a, l) => a + l.Units, 0);
    sibpPackTotal += std.sibp.packOH + std.sibp.packOrder + (units * std.sibp.packUnit);
}
const sibpTotal = sibpPickTotal + sibpPackTotal;

// ================================================================
// SCENARIO 6: IIBP — Single-item only, 1 Pick+Pack job per unique SKU
// ================================================================
resetCursor();
const iibpData = [];
const iibpSkuGroups = {};
for (const orderId of singleItemOrderIds) {
    for (const line of orderMap[orderId]) {
        if (!iibpSkuGroups[line.SKU]) iibpSkuGroups[line.SKU] = [];
        iibpSkuGroups[line.SKU].push({ orderId, line });
    }
}
// Picking (1 job per SKU)
for (const [sku, entries] of Object.entries(iibpSkuGroups)) {
    const jobCode = `IIBP-${sku}`;
    for (const entry of entries) {
        iibpData.push(makeRow('IIBP', 'WAVE-IIBP-1', jobCode, 'Picking', entry.orderId, entry.line.SKU, entry.line.Location, entry.line.Units));
    }
}
// Packing (1 job per SKU — all orders for that SKU packed together)
for (const [sku, entries] of Object.entries(iibpSkuGroups)) {
    const jobCode = `PACK-IIBP-${sku}`;
    for (const entry of entries) {
        iibpData.push(makeRow('IIBP', 'WAVE-IIBP-1', jobCode, 'Packing', entry.orderId, entry.line.SKU, 'PACK-STATION', entry.line.Units));
    }
}
// Math: 1 pick job + 1 pack job per unique SKU
let iibpPickTotal = 0;
let iibpPackTotal = 0;
for (const [sku, entries] of Object.entries(iibpSkuGroups)) {
    const jobLines = entries.map(e => e.line);
    const locs = new Set(jobLines.map(l => l.Location)).size;
    const locSkus = new Set(jobLines.map(l => `${l.Location}|${l.SKU}`)).size;
    const nOrders = entries.length;
    const units = jobLines.reduce((a, l) => a + l.Units, 0);
    iibpPickTotal += std.iibp.pickOH + (locs * std.iibp.pickLoc) + (locSkus * std.iibp.pickSKU);
    iibpPackTotal += std.iibp.packOH + (nOrders * std.iibp.packOrder) + (units * std.iibp.packUnit);
}
const iibpTotal = iibpPickTotal + iibpPackTotal;

// ================================================================
// SCENARIO 7: IOBP — Group by identical SKU+Unit combo (location excluded)
// ================================================================
resetCursor();
const iobpData = [];
const iobpCombos = {};
for (const orderId of allOrderIds) {
    const lines = orderMap[orderId];
    const comboKey = lines.map(l => `${l.SKU}:${l.Units}`).sort().join('|');
    if (!iobpCombos[comboKey]) iobpCombos[comboKey] = [];
    iobpCombos[comboKey].push(orderId);
}
// Picking (1 job per combo)
let comboIdx = 0;
for (const [combo, orderIds] of Object.entries(iobpCombos)) {
    comboIdx++;
    const jobCode = `IOBP-COMBO-${comboIdx}`;
    for (const orderId of orderIds) {
        for (const line of orderMap[orderId]) {
            iobpData.push(makeRow('IOBP', 'WAVE-IOBP-1', jobCode, 'Picking', orderId, line.SKU, line.Location, line.Units));
        }
    }
}
// Packing (1 job per order)
for (const orderId of allOrderIds) {
    for (const line of orderMap[orderId]) {
        iobpData.push(makeRow('IOBP', 'WAVE-IOBP-1', `PACK-${orderId}`, 'Packing', orderId, line.SKU, 'PACK-STATION', line.Units));
    }
}
// Math
let iobpPickTotal = 0;
for (const [combo, orderIds] of Object.entries(iobpCombos)) {
    const comboLines = orderIds.flatMap(id => orderMap[id]);
    const locs = new Set(comboLines.map(l => l.Location)).size;
    const locSkus = new Set(comboLines.map(l => `${l.Location}|${l.SKU}`)).size;
    iobpPickTotal += std.iobp.pickOH + (locs * std.iobp.pickLoc) + (locSkus * std.iobp.pickSKU);
}
let iobpPackTotal = 0;
for (const orderId of allOrderIds) {
    const units = orderMap[orderId].reduce((a, l) => a + l.Units, 0);
    iobpPackTotal += std.iobp.packOH + std.iobp.packOrder + (units * std.iobp.packUnit);
}
const iobpTotal = iobpPickTotal + iobpPackTotal;

// ===== PRINT SUMMARY =====
console.log('\n=== EXPECTED STANDARD SECONDS ===');
console.log(`OBPP-01: Pick=${obppPick}s + Pack=${obppPack}s = ${obppTotal}s`);
console.log(`PUTW-01: Pick=${putwPickTotal}s + Sort=${putwSortTotal}s + Pack=${putwPackTotal}s = ${putwTotal}s`);
console.log(`MICP-01: Pick=${micpPickTotal}s + Pack=${micpPackTotal}s = ${micpTotal}s`);
console.log(`SICP-01: Pick=${sicpPickTotal}s + Pack=${sicpPackTotal}s = ${sicpTotal}s (${sicpNofOrders} orders, ${sicpLocs} locs, ${sicpLocSkus} sku combos)`);
console.log(`SIBP-01: Pick=${sibpPickTotal}s + Pack=${sibpPackTotal}s = ${sibpTotal}s (${singleItemOrderIds.length} orders, ${sibpLocs} locs, ${sibpLocSkus} sku combos)`);
console.log(`IIBP-01: Pick=${iibpPickTotal}s + Pack=${iibpPackTotal}s = ${iibpTotal}s (${Object.keys(iibpSkuGroups).length} SKU groups)`);
console.log(`IOBP-01: Pick=${iobpPickTotal}s + Pack=${iobpPackTotal}s = ${iobpTotal}s (${Object.keys(iobpCombos).length} combo groups)`);

// ===== BUILD SCENARIOS =====
function scenario(id, name, desc, logic, expected, data) {
    return {
        id, name, description: desc, category: 'ENGINEERED_STANDARDS',
        environmentId: 'JOB_ANALYZER_LOCAL', explanation: logic,
        logic: '', status: 'IDLE',
        steps: ['Load golden dataset payload', 'Parse into ShiftRecords', 'Execute Happy Path Calculation', 'Assert Standard Time matches Expected'],
        expectedResults: { totalStandardSeconds: expected },
        testData: data
    };
}

const scenarios = [
    scenario('OBPP-01', 'OBPP Standards Audit',
        `Order-Based Pick & Pack. 25 orders, 40 lines, 55 units. 1 Job = 1 Order.`,
        `Per-order Job OH + Location + SKU multipliers. Packing OH + Order + Unit per order.`,
        obppTotal, obppData),

    scenario('PUTW-01', 'PUTW Standards Audit',
        `Put-Wall 3-Phase. 25 orders, 40 lines, 55 units. 1 Batch Pick -> 1 Sort -> 25 Pack.`,
        `Batch Pick OH + Loc + SKU. Sort OH + per-unit. Pack OH + Order + Unit per order.`,
        putwTotal, putwData),

    scenario('MICP-01', 'MICP Standards Audit',
        `Multi-Item Carton Profiling. 25 orders in ${micpCarts.length} carts (max 12/cart). 40 lines, 55 units.`,
        `Per-cart Pick OH + Loc + SKU + Line. Pack OH + Order + Unit per order.`,
        micpTotal, micpData),

    scenario('SICP-01', 'SICP Standards Audit',
        `Single-Item Carton Profiling. ${sicpNofOrders} single-item orders, 1 cart, ${sicpLocs} loc, ${sicpLocSkus} SKU.`,
        `1 Cart Pick OH + Loc + SKU + Line. Pack OH + Order + Unit per order.`,
        sicpTotal, sicpData),

    scenario('SIBP-01', 'SIBP Standards Audit',
        `Single-Item Batch Pick. ${singleItemOrderIds.length} single-item orders, 1 batch job, ${sibpLocs} loc, ${sibpLocSkus} SKU.`,
        `1 Batch Pick OH + Loc + SKU. Pack OH + Order + Unit per order.`,
        sibpTotal, sibpData),

    scenario('IIBP-01', 'IIBP Standards Audit',
        `Item-In-Box Profiling. ${singleItemOrderIds.length} single-item orders, ${Object.keys(iibpSkuGroups).length} SKU group(s).`,
        `1 Pick + 1 Pack job per unique SKU. OH + Loc + SKU per pick job. OH + Orders*Order + Units*Unit per pack job.`,
        iibpTotal, iibpData),

    scenario('IOBP-01', 'IOBP Standards Audit',
        `Identical Order Batch. 25 orders grouped into ${Object.keys(iobpCombos).length} identical SKU+Unit combos.`,
        `1 Pick job per combo. OH + Loc + SKU per pick job. Pack OH + Order + Unit per order.`,
        iobpTotal, iobpData),
];

fs.writeFileSync('./src/data/gola-audit-scenarios.json', JSON.stringify(scenarios, null, 4));
console.log('\n✅ Successfully wrote all 7 scenarios to gola-audit-scenarios.json');
