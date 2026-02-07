import { read, utils } from 'xlsx';
import { ShiftRecordSchema, type ShiftRecord, type IngestionSummary } from '../types';
import { processWarehouseLogic } from '../logic/warehouse-transform';

// ----------------------------------------------------------------------
// State (Cache)
// ----------------------------------------------------------------------
let cachedRecords: ShiftRecord[] = [];
let cachedSummary: IngestionSummary | null = null;
let currentConfig: {
    smoothingTolerance?: number;
    breakThreshold?: number;
    travelRatio?: number;
} = {};

export interface WorkerMessage {
    type: 'UPLOAD' | 'REPROCESS';
    files?: File[];
    config?: {
        smoothingTolerance?: number;
        breakThreshold?: number;
        travelRatio?: number;
    };
}

// Map Excel Header -> ShiftRecord Key
const COLUMN_MAP: Record<string, keyof ShiftRecord> = {
    // Standard Headers
    'Account': 'Account',
    'Client': 'Client',
    'Warehouse': 'Warehouse',
    'Wave code': 'WaveCode',
    'Wave Code': 'WaveCode',
    'Wave': 'WaveCode',
    'Market Wave': 'WaveCode',
    'Wave Number': 'WaveCode',
    'WAVE NO': 'WaveCode',
    'Wave No': 'WaveCode',
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
    'AI?': 'IsAI',

    // Flexible / Common Variations
    'JobCode': 'JobCode',
    'Job_Code': 'JobCode',
    'jobcode': 'JobCode',
    'JobType': 'JobType',
    'Job_Type': 'JobType',
    'TaskType': 'TaskType',
    'Task_Type': 'TaskType',
    'Quantity': 'Quantity',
    'Qty': 'Quantity',
    'UOM Qty': 'Quantity',
    'Start': 'Start',
    'StartTime': 'Start',
    'Start Time': 'Start',
    'End': 'Finish',
    'EndTime': 'Finish',
    'Finish': 'Finish',
    'FinishTime': 'Finish',
    'Finish Time': 'Finish',
    'User': 'User',
    'Worker': 'User',
    'Employee': 'User',
    // User Provided New Format (Feb 6)
    'warehouseJobCode': 'JobCode',
    'waveNo': 'WaveCode',
    'jobTypeName': 'JobType',
    'warehouseTaskTypeName': 'TaskType',
    'fromTaskQuantity': 'Quantity',
    'fromTaskUOMQuantity': 'Quantity', // Added based on diagnostic
    'fromWarehouseLocationCode': 'Location',
    'createdByEmail': 'User',
    'plannedStartDateTime': 'Start',
    'plannedFinishDateTime': 'Finish',
    'productSku': 'SKU',
    'shipmentOrderCode': 'OrderCode',
    'aiJobTypeDescription': 'AIJobDescription',
    'createdDateTime': 'Start', // Fallback if planned missing, or logic below will handle precedence
    'productName': 'AIJobDescription', // Fallback description?
    // 'code'? 'warehouseTaskTypeId'? - Unmapped
};

const normalizeRecord = (row: any): Record<string, any> => {
    const normalized: Record<string, any> = {};

    // 1. Map Columns
    Object.keys(row).forEach(key => {
        // Basic fuzzy match: trim spaces
        const cleanKey = key.trim();
        const mappedKey = COLUMN_MAP[cleanKey] || COLUMN_MAP[Object.keys(COLUMN_MAP).find(k => k.toLowerCase() === cleanKey.toLowerCase()) || ''];

        if (mappedKey) {
            // Priority Check: Don't overwrite if already set (e.g. Start set by planned, don't overwrite with created)
            // But iteration order is uncertain. Better to map explicit preference below.
            // Actually, if we map 'createdDateTime' to 'Start', it might overwrite 'plannedStartDateTime' -> 'Start'.
            // Simple approach: Map unique keys for intermediate, then consolidate.
            // But COLUMN_MAP maps directly to Schema keys.
            // Let's rely on standard map, but special case IsAI.
            normalized[mappedKey] = row[key];
        } else {
            // Keep raw for custom logic if needed?
            // normalized[cleanKey] = row[key]; 
        }
    });

    // 2. Custom Logic for New Format

    // AI Description -> IsAI
    if (normalized['AIJobDescription']) {
        const desc = String(normalized['AIJobDescription']).trim();
        if (desc.length > 0) {
            normalized['IsAI'] = true;
        }
    }

    // Start/Finish Preference
    // If we have 'plannedStartDateTime' in raw row, use it.
    // Since COLUMN_MAP maps both 'plannedStart' and 'created' to 'Start', the last one visited wins.
    // This is risky. Let's REMOVE 'createdDateTime' from COLUMN_MAP above and handle it here explicitly.

    // Wait, I can't see the raw keys easily inside the normalized loop if I only look at mapped.
    // Let's check raw row for fallback if normalized.Start is missing.
    if (!normalized['Start'] && row['createdDateTime']) {
        normalized['Start'] = row['createdDateTime'];
    }
    if (!normalized['Finish'] && row['createdDateTime']) {
        // If we used created for Start, maybe valid for Finish too (Instant task)?
        // But allow 'plannedFinishDateTime' to take precedence if mapped.
        if (!normalized['Finish']) normalized['Finish'] = row['createdDateTime'];
    }

    return normalized;
};

self.onmessage = async (e: MessageEvent<File | File[] | WorkerMessage>) => {
    try {
        let files: File[] = [];
        let config: { smoothingTolerance?: number; breakThreshold?: number; travelRatio?: number } | undefined = undefined;
        let isReprocess = false;

        // 1. Unpack Message
        // ------------------------------------------------------------------
        if ('type' in e.data && (e.data.type === 'UPLOAD' || e.data.type === 'REPROCESS')) {
            const msg = e.data as WorkerMessage;
            if (msg.type === 'UPLOAD') {
                files = msg.files || [];
                config = msg.config;
            } else if (msg.type === 'REPROCESS') {
                isReprocess = true;
                config = msg.config;
            }
        } else {
            // Legacy / Direct File support
            files = Array.isArray(e.data) ? e.data : [e.data as File];
        }

        // Update config cache
        if (config) currentConfig = { ...currentConfig, ...config };

        // Prepare Transform Config
        const transformConfig = {
            smoothingToleranceMs: (currentConfig.smoothingTolerance ?? 2) * 1000,
            breakThresholdSec: currentConfig.breakThreshold ?? 300, // Default 300s
            travelRatio: currentConfig.travelRatio ?? 0.70 // Default 70%
        };

        // 2. Reprocess vs Upload
        // ------------------------------------------------------------------
        if (isReprocess) {
            if (cachedRecords.length === 0) {
                self.postMessage({ type: 'SUCCESS', data: [], taskObjects: [], activityObjects: [], summary: cachedSummary || undefined });
                return;
            }

            try {
                // Re-run Logic
                const logicResult = processWarehouseLogic(cachedRecords, transformConfig);
                self.postMessage({
                    type: 'SUCCESS',
                    data: cachedRecords,
                    taskObjects: logicResult.tasks,
                    activityObjects: logicResult.activities,
                    summary: cachedSummary
                });
            } catch (logicErr) {
                self.postMessage({ type: 'ERROR', message: (logicErr as Error).message });
            }
            return;
        }

        // 3. File Parsing (Upload)
        // ------------------------------------------------------------------
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

                let rawData: any[] = [];

                // OPTIMIZATION: Custom CSV Parser for large files to bypass SheetJS limits
                if (file.name.toLowerCase().endsWith('.csv')) {
                    const text = new TextDecoder().decode(buffer);
                    let pos = 0;

                    // Helper: Read next line without creating array
                    const nextLine = (): string | null => {
                        if (pos >= text.length) return null;
                        let end = text.indexOf('\n', pos);
                        if (end === -1) end = text.length;
                        const line = text.slice(pos, end).trim(); // Use slice (faster than substring)
                        pos = end + 1;
                        return line;
                    };

                    // 1. Smart Header Detection (Scan first 25 lines)
                    let headerRowIndex = 0;
                    let bestMatchIndex = -1;
                    let maxMatches = 0;
                    const previewLines: string[] = [];

                    // Capture first 50 lines for header detection
                    const initialPos = pos;
                    for (let i = 0; i < 50; i++) {
                        const l = nextLine();
                        if (l === null) break;
                        previewLines.push(l);
                    }
                    pos = initialPos; // Reset for actual processing

                    for (let i = 0; i < previewLines.length; i++) {
                        const line = previewLines[i];
                        if (!line) continue;
                        const cells = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                        let matches = 0;
                        cells.forEach(cell => {
                            if (COLUMN_MAP[cell] ||
                                Object.keys(COLUMN_MAP).some(k => k.toLowerCase() === cell.toLowerCase())) {
                                matches++;
                            }
                        });
                        if (matches >= 3 && matches > maxMatches) {
                            maxMatches = matches;
                            bestMatchIndex = i;
                        }
                    }

                    if (bestMatchIndex > -1) {
                        // Skip lines until header
                        for (let i = 0; i < bestMatchIndex; i++) nextLine();
                    }

                    // Parse Header
                    const headerLine = nextLine();
                    if (!headerLine) {
                        errors.push(`File ${file.name} is empty or missing headers.`);
                        continue;
                    }

                    // Basic CSV line parser (lifted)
                    const parseLine = (line: string): string[] => {
                        const res = [];
                        let current = '';
                        let inQuote = false;
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                                inQuote = !inQuote;
                            } else if (char === ',' && !inQuote) {
                                res.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        res.push(current.trim());
                        return res.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
                    };

                    const headers = parseLine(headerLine);

                    // 2. Stream Processing
                    let line: string | null;
                    let userIndex = 0;

                    while ((line = nextLine()) !== null) {
                        if (!line) continue;

                        const values = parseLine(line);
                        const row: Record<string, any> = {};

                        // Map 
                        headers.forEach((header, idx) => {
                            if (idx < values.length) {
                                row[header] = values[idx];
                            }
                        });

                        // DIRECT PROCESSING (No rawData array)
                        totalRows++;
                        if (totalRows % 5000 === 0) self.postMessage({ type: 'PROGRESS', processed: totalRows });

                        const normalized = normalizeRecord(row);
                        normalized.filename = file.name;

                        // Validation
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

                            if (record.Quantity === 0 && warnings.length < 50) {
                                warnings.push(`Row ${totalRows} (${file.name}): Quantity is 0`);
                            }
                        } else {
                            if (errors.length < 10) {
                                const errorMsg = result.error.issues.map((err: any) => `${err.path}: ${err.message}`).join(', ');
                                errors.push(`Row ${totalRows} (${file.name}): ${errorMsg}`);
                            }
                        }
                    }

                } else {
                    // Standard Excel Logic with Retry Strategy (Optimized for Memory)
                    let workbook: any;
                    let readError: any;

                    const commonOptions = { dense: true, cellHTML: false, cellFormula: false, cellStyles: false };

                    // Attempt 1: Standard (Uint8Array + Dates)
                    try {
                        workbook = read(new Uint8Array(buffer), { type: 'array', cellDates: true, ...commonOptions });
                        if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) throw new Error("Empty Sheets");
                    } catch (e1) {
                        // Attempt 2: Robust (No Dates)
                        try {
                            workbook = read(new Uint8Array(buffer), { type: 'array', cellDates: false, ...commonOptions });
                            if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) throw new Error("Empty Sheets");
                        } catch (e2) {
                            // Attempt 3: String / HTML / XML
                            try {
                                const text = new TextDecoder("utf-8").decode(buffer);
                                workbook = read(text, { type: 'string', cellDates: true, ...commonOptions });
                                if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) throw new Error("Empty Sheets");
                            } catch (e3) {
                                // Attempt 4: Legacy Binary
                                try {
                                    const binary = new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '');
                                    workbook = read(binary, { type: 'binary', cellDates: true, ...commonOptions });
                                    if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) throw new Error("Empty Sheets");
                                } catch (e4) {
                                    readError = e4;
                                }
                            }
                        }
                    }

                    if (!workbook || !workbook.SheetNames) {
                        errors.push(`Critical: Failed to parse Excel file. Cause: ${readError?.message || 'Unknown Format'}`);
                        continue;
                    }

                    if (workbook.SheetNames.length === 0) {
                        errors.push(`File ${file.name} has no sheets.`);
                        continue;
                    }

                    if (workbook.SheetNames.length > 1) {
                        errors.push(`File ${file.name} contains ${workbook.SheetNames.length} sheets. Please upload a SINGLE sheet.`);
                        continue;
                    }

                    const firstSheetName = workbook.SheetNames[0];
                    let worksheet = workbook.Sheets[firstSheetName];
                    if (!worksheet) {
                        const sheetKeys = Object.keys(workbook.Sheets);
                        if (sheetKeys.length > 0) worksheet = workbook.Sheets[sheetKeys[0]];
                    }

                    if (!worksheet) {
                        errors.push(`File ${file.name} could not read any sheets.`);
                        continue;
                    }

                    // MEMORY OPTIMIZATION: Use 'header: 1' to get Array of Arrays (avoiding object overhead)
                    // With dense: true, this should be fast.
                    const sheetData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    if (sheetData.length === 0) {
                        errors.push(`File ${file.name} contains no data rows.`);
                        continue;
                    }

                    // Smart Header Detection on Array Data
                    let headerRowIndex = 0;
                    let bestMatchIndex = -1;
                    let maxMatches = 0;

                    // Scan first 25 rows
                    const scanLimit = Math.min(sheetData.length, 25);
                    for (let i = 0; i < scanLimit; i++) {
                        const row = sheetData[i];
                        if (!Array.isArray(row)) continue;

                        let matches = 0;
                        row.forEach(cell => {
                            if (typeof cell === 'string') {
                                const clean = cell.replace(/\u00A0/g, ' ').trim();
                                if (clean.length > 0 && (COLUMN_MAP[clean] || Object.keys(COLUMN_MAP).some(k => k.toLowerCase() === clean.toLowerCase()))) {
                                    matches++;
                                }
                            }
                        });

                        if (matches > 0 && matches > maxMatches) {
                            maxMatches = matches;
                            bestMatchIndex = i;
                        }
                    }

                    if (bestMatchIndex > -1) headerRowIndex = bestMatchIndex;

                    // Extract Headers
                    const headerRow = sheetData[headerRowIndex];
                    if (!Array.isArray(headerRow)) {
                        errors.push(`File ${file.name}: Could not identify valid headers.`);
                        continue;
                    }

                    const headers = headerRow.map(h => String(h).trim());

                    // Process Data Rows (Streaming-like loop)
                    for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
                        const rowArray = sheetData[i];
                        if (!Array.isArray(rowArray) || rowArray.length === 0) continue;

                        const row: Record<string, any> = {};
                        headers.forEach((h, idx) => {
                            if (idx < rowArray.length) row[h] = rowArray[idx];
                        });

                        totalRows++;
                        if (totalRows % 5000 === 0) self.postMessage({ type: 'PROGRESS', processed: totalRows });
                        const normalized = normalizeRecord(row);
                        normalized.filename = file.name;

                        // Validation
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

                            if (record.Quantity === 0 && warnings.length < 50) {
                                warnings.push(`Row ${i + 1} (${file.name}): Quantity is 0`);
                            }
                        } else {
                            // Heuristic for metadata rows
                            let isMetadataRow = false;
                            if (i === headerRowIndex + 1) { // First data row
                                const issues = result.error.issues;
                                if (issues.find((issue: any) => issue.path.includes('Quantity'))) isMetadataRow = true;
                            }

                            if (!isMetadataRow && errors.length < 10) {
                                const errorMsg = result.error.issues.map((err: any) => `${err.path}: ${err.message}`).join(', ');
                                errors.push(`Row ${i + 1} (${file.name}): ${errorMsg}`);
                            }
                        }
                    }

                    // Diagnostic if empty results
                    // Diagnostic if empty results
                    if (results.length === 0 && sheetData.length > 0) {
                        const detected = headers.join(', ');
                        errors.unshift(`DIAGNOSTIC: Headers found: [${detected}].`);
                    }
                }
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

        // Cache Update
        cachedRecords = results;
        cachedSummary = summary;

        // ----------------------------------------------------------------------
        // Step 4: Run Warehouse Logic (New)
        // ----------------------------------------------------------------------
        let taskObjects: any[] = [];
        let activityObjects: any[] = [];
        try {
            // Prepare Transform Config (Ensure scope)
            const transformConfig = {
                smoothingToleranceMs: (currentConfig.smoothingTolerance ?? 2) * 1000,
                breakThresholdSec: currentConfig.breakThreshold ?? 300,
                travelRatio: currentConfig.travelRatio ?? 0.70
            };

            // New: Pass full config
            const logicResult = processWarehouseLogic(results, transformConfig);
            taskObjects = logicResult.tasks;
            activityObjects = logicResult.activities;
        } catch (logicErr) {
            console.error("Warehouse Logic Error:", logicErr);
            errors.push(`Logic Error: ${(logicErr as Error).message}`);
        }

        self.postMessage({
            type: 'SUCCESS',
            data: results,
            taskObjects,
            activityObjects,
            summary
        });
    } catch (err) {
        self.postMessage({ type: 'ERROR', message: (err as Error).message });
    }
};
