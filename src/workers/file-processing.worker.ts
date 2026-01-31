import { read, utils } from 'xlsx';
import { ShiftRecordSchema, type ShiftRecord, type IngestionSummary } from '../types';


// Map Excel Header -> ShiftRecord Key
const COLUMN_MAP: Record<string, keyof ShiftRecord> = {
    'Account': 'Account',
    'Client': 'Client',
    'Warehouse': 'Warehouse',
    'Wave code': 'WaveCode',
    'Job Code': 'JobCode',
    'Job Type': 'JobType',
    'AI Job Description': 'AIJobDescription',
    'Order Code': 'OrderCode',
    'Task Type': 'TaskType',
    'SKU': 'SKU',
    'Task UOM Qty': 'Quantity',
    'Source Location Zone': 'Zone',
    'Source location': 'Location',
    'Executed By User': 'User',
    'Task start datetime': 'Start',
    'Task finish datetime': 'Finish',
    'Start Date': 'Start',
    'Finish Date': 'Finish',
    'AI?': 'IsAI'
};

const normalizeRecord = (row: any): Record<string, any> => {
    const normalized: Record<string, any> = {};

    Object.keys(row).forEach(key => {
        // Basic fuzzy match: trim spaces
        const cleanKey = key.trim();
        const mappedKey = COLUMN_MAP[cleanKey] || COLUMN_MAP[Object.keys(COLUMN_MAP).find(k => k.toLowerCase() === cleanKey.toLowerCase()) || ''];

        if (mappedKey) {
            normalized[mappedKey] = row[key];
        }
    });

    return normalized;
};

self.onmessage = async (e: MessageEvent<File | File[]>) => {
    try {
        const files = Array.isArray(e.data) ? e.data : [e.data];
        const results: ShiftRecord[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];

        // Summary Statistics Trackers
        const usersSet = new Set<string>();
        const warehousesSet = new Set<string>();
        const clientsSet = new Set<string>();
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        let totalRows = 0;

        for (const file of files) {
            try {
                const buffer = await file.arrayBuffer();

                // Robustness: Handle empty files
                if (buffer.byteLength === 0) {
                    errors.push(`File ${file.name} is empty.`);
                    continue;
                }

                const workbook = read(buffer, { type: 'array', cellDates: true });

                if (workbook.SheetNames.length === 0) {
                    errors.push(`File ${file.name} has no sheets.`);
                    continue;
                }

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const rawData = utils.sheet_to_json(worksheet);

                if (rawData.length === 0) {
                    errors.push(`File ${file.name} sheet '${firstSheetName}' contains no data rows.`);
                    continue;
                }

                rawData.forEach((row: any, index) => {
                    totalRows++;
                    const normalized = normalizeRecord(row);
                    normalized.filename = file.name;

                    // Zod validation
                    const result = ShiftRecordSchema.safeParse(normalized);

                    if (result.success) {
                        const record = result.data;
                        results.push(record);

                        // Track Stats
                        usersSet.add(record.User);
                        if (record.Warehouse) warehousesSet.add(record.Warehouse);
                        if (record.Client) clientsSet.add(record.Client);

                        if (!minDate || record.Start < minDate) minDate = record.Start;
                        if (!maxDate || record.Finish > maxDate) maxDate = record.Finish;

                        // Data Integrity Checks (Warnings)
                        if (record.Quantity === 0) {
                            if (warnings.length < 50) {
                                warnings.push(`Row ${index + 2} (${file.name}): Quantity is 0`);
                            }
                        }

                    } else {
                        // Log first 10 errors to avoid spam
                        if (errors.length < 10) {
                            const errorMsg = result.error.issues.map((err: any) => `${err.path}: ${err.message}`).join(', ');
                            errors.push(`Row ${index + 2} (${file.name}): ${errorMsg}`);
                        }
                    }
                });
            } catch (fileErr) {
                errors.push(`Critical error reading ${file.name}: ${(fileErr as Error).message}`);
            }
        }

        const summary: IngestionSummary = {
            totalRows,
            validRows: results.length,
            errorRows: totalRows - results.length,
            dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
            uniqueUsers: usersSet.size,
            warehouses: Array.from(warehousesSet),
            clients: Array.from(clientsSet),
            errors: errors.slice(0, 10),
            warnings: warnings.slice(0, 50),
            assumptions: [
                "Dates coerced from Serial/String to JS Date",
                "Numeric strings converted to Numbers",
                "'Yes'/'No' coerced to Boolean true/false",
                "Trimmed whitespace from all string fields"
            ]
        };

        self.postMessage({
            type: 'SUCCESS',
            data: results,
            summary // Pass robust summary
        });
    } catch (err) {
        self.postMessage({ type: 'ERROR', message: (err as Error).message });
    }
};
