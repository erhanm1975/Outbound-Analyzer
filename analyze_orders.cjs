const fs = require('fs');
const d = JSON.parse(fs.readFileSync('./src/data/GOLA-Audit-Order-List.json', 'utf8')).Sheet1;

// Group lines by Order
const orders = {};
for (const line of d) {
    if (!orders[line.Order]) orders[line.Order] = [];
    orders[line.Order].push(line);
}

console.log('Order | Lines | SKUs | TotalUnits | SingleSKU+SingleUnit');
console.log('------|-------|------|------------|---------------------');

const singleOrders = [];
const multiOrders = [];

for (const [orderId, lines] of Object.entries(orders)) {
    const skuSet = new Set(lines.map(l => l.SKU));
    const totalUnits = lines.reduce((a, l) => a + l.Units, 0);
    const isSingle = lines.length === 1 && totalUnits === 1;
    console.log(`${orderId} | ${lines.length} | ${skuSet.size} | ${totalUnits} | ${isSingle ? 'YES' : 'NO'}`);
    if (isSingle) singleOrders.push(orderId);
    else multiOrders.push(orderId);
}

console.log('');
console.log(`Single-SKU+Single-Unit Orders: ${singleOrders.length} -> ${singleOrders.join(', ')}`);
console.log(`Multi Orders: ${multiOrders.length} -> ${multiOrders.join(', ')}`);
console.log('');

// IOBP: group orders that have IDENTICAL SKU+Unit composition (location excluded)
console.log('=== IOBP IDENTICAL COMBOS (SKU+Unit, ignoring Location) ===');
const combos = {};
for (const [orderId, lines] of Object.entries(orders)) {
    const comboKey = lines.map(l => `${l.SKU}:${l.Units}`).sort().join('|');
    if (!combos[comboKey]) combos[comboKey] = [];
    combos[comboKey].push(orderId);
}
for (const [combo, orderIds] of Object.entries(combos)) {
    console.log(`${combo} -> ${orderIds.length} orders: ${orderIds.join(', ')}`);
}

// Unique locations
console.log('');
const allLocs = new Set(d.map(l => l.Location));
const allSkus = new Set(d.map(l => l.SKU));
console.log(`Total Lines: ${d.length}`);
console.log(`Unique Locations: ${allLocs.size} -> ${Array.from(allLocs).sort().join(', ')}`);
console.log(`Unique SKUs: ${allSkus.size} -> ${Array.from(allSkus).sort().join(', ')}`);
console.log(`Total Units: ${d.reduce((a, l) => a + l.Units, 0)}`);
