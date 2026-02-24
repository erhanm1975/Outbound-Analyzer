import * as xlsx from 'xlsx';
import fs from 'fs';

try {
    const buf = fs.readFileSync('./User Doc/GOLA Audit Scenario.xlsx');
    const workbook = xlsx.read(buf, { type: 'buffer' });
    console.log('Successfully opened workbook. Sheets:');

    let allData: any = {};
    for (const sheetName of workbook.SheetNames) {
        console.log(`- ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        allData[sheetName] = data;
    }

    fs.writeFileSync('./src/data/GOLA-Audit-Order-List.json', JSON.stringify(allData, null, 2));
    console.log('Saved to src/data/GOLA-Audit-Order-List.json');
} catch (e) {
    console.error('Failed to parse:', e);
}
