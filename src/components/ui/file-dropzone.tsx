import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, Database, Loader2, AlertCircle, X, Check, Table, Filter, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    isProcessing: boolean;
}

function getLocalDatetimeString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getYesterdayStart() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return getLocalDatetimeString(d);
}

function getYesterdayEnd() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 999);
    return getLocalDatetimeString(d);
}

export function FileDropzone({ onFilesSelected, isProcessing }: FileDropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    // Snowflake States
    const [isSnowflakeSyncing, setIsSnowflakeSyncing] = useState(false);
    const [snowflakeError, setSnowflakeError] = useState<string | null>(null);
    const [showSnowflakeModal, setShowSnowflakeModal] = useState(false);

    // Filter States
    const [accountId, setAccountId] = useState('');
    const [warehouse, setWarehouse] = useState('');
    const [beginDate, setBeginDate] = useState(getYesterdayStart());
    const [endDate, setEndDate] = useState(getYesterdayEnd());

    // Account Dropdown States
    const [availableAccounts, setAvailableAccounts] = useState<{ id: string, name: string }[]>([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

    // Warehouse Dropdown States
    const [availableWarehouses, setAvailableWarehouses] = useState<{ id: string, code: string }[]>([]);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

    // Review States
    const [previewData, setPreviewData] = useState<any[] | null>(null);
    const [schemaObjects, setSchemaObjects] = useState<any[] | null>(null);
    const [isFetchingObjects, setIsFetchingObjects] = useState(false);
    const [isTestMode, setIsTestMode] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndPass(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndPass(Array.from(e.target.files));
        }
    };

    const validateAndPass = (files: File[]) => {
        const valid = files.filter(f =>
            f.name.endsWith('.xlsx') ||
            f.name.endsWith('.xls') ||
            f.name.endsWith('.csv')
        );
        if (valid.length > 0) {
            onFilesSelected(valid);
        }
    };

    const fetchAccountOptions = async () => {
        setIsLoadingAccounts(true);
        try {
            const res = await fetch('/api/snowflake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_accounts' })
            });
            const data = await res.json();
            if (res.ok && data.rows?.length > 0) {
                const accts = data.rows.map((r: any) => {
                    const disp = String(r.DisplayName || r.DISPLAYNAME || '');
                    const orgId = r.OrganizationId || r.ORGANIZATIONID || '';
                    const official = r.OfficialIdentity || r.OFFICIALIDENTITY || '';

                    let fullName = disp;
                    if (orgId || official) {
                        const extras = [];
                        if (orgId) extras.push(`Org: ${orgId}`);
                        if (official && official !== disp) extras.push(`Id: ${official}`);
                        if (extras.length > 0) fullName += ` (${extras.join(', ')})`;
                    }

                    return {
                        id: String(r.Id || r.ID),
                        name: fullName
                    };
                }).filter((a: any) => a.id && a.name && a.id !== 'undefined');

                // Sort accounts by name
                accts.sort((a: any, b: any) => a.name.localeCompare(b.name));
                setAvailableAccounts(accts);
            }
        } catch (e) {
            console.error("Failed to fetch accounts for dropdown", e);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    const fetchWarehouseOptions = async (selectedAccountId: string) => {
        if (!selectedAccountId) {
            setAvailableWarehouses([]);
            setWarehouse('');
            return;
        }
        setIsLoadingWarehouses(true);
        setWarehouse(''); // reset warehouse on account change
        try {
            const res = await fetch('/api/snowflake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_warehouses', accountId: selectedAccountId })
            });
            const data = await res.json();
            if (res.ok && data.rows?.length > 0) {
                const items = data.rows.map((r: any) => ({
                    id: String(r.Id || r.ID),
                    code: String(r.Code || r.CODE || Object.values(r)[1])
                })).filter((w: any) => w.id && w.code && w.id !== 'undefined' && w.code !== 'undefined');
                const seen = new Set<string>();
                const unique = items.filter((w: any) => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });
                unique.sort((a: any, b: any) => a.code.localeCompare(b.code));
                setAvailableWarehouses(unique);
            } else {
                setAvailableWarehouses([]);
            }
        } catch (e) {
            console.error("Failed to fetch warehouses for dropdown", e);
            setAvailableWarehouses([]);
        } finally {
            setIsLoadingWarehouses(false);
        }
    };

    const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setAccountId(val);
        fetchWarehouseOptions(val);
    };

    const handleOpenModal = () => {
        setShowSnowflakeModal(true);
        setPreviewData(null);
        setSnowflakeError(null);
        if (availableAccounts.length === 0) {
            fetchAccountOptions();
        }
    };

    const handleCancelSync = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const fetchWarehouseData = async () => {
        setIsSnowflakeSyncing(true);
        setSnowflakeError(null);
        setPreviewData(null);
        setSchemaObjects(null);

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch('/api/snowflake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'pull_data_custom',
                    warehouse,
                    beginDate,
                    endDate,
                    isTestMode
                }),
                signal: abortControllerRef.current.signal
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch Snowflake data');
            }
            if (!data.rows || data.rows.length === 0) {
                throw new Error("No records found for these exact filters.");
            }

            setPreviewData(data.rows);

        } catch (err: any) {
            if (err.name === 'AbortError') {
                setSnowflakeError('Query was cancelled by user.');
            } else {
                setSnowflakeError(err.message || 'Unknown error fetching data');
            }
        } finally {
            setIsSnowflakeSyncing(false);
            abortControllerRef.current = null;
        }
    };

    const fetchSchemaObjects = async () => {
        setIsFetchingObjects(true);
        setSchemaObjects(null);
        setPreviewData(null);
        setSnowflakeError(null);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch('/api/snowflake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_objects' }),
                signal: abortControllerRef.current.signal
            });
            const data = await res.json();
            if (res.ok && data.rows) {
                setSchemaObjects(data.rows);
            } else {
                setSchemaObjects([]);
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setSnowflakeError('Query was cancelled by user.');
            } else {
                setSnowflakeError(err.message || 'Unknown error fetching objects');
            }
        } finally {
            setIsFetchingObjects(false);
            abortControllerRef.current = null;
        }
    };

    const handleApproveAndImport = () => {
        if (!previewData || previewData.length === 0) return;

        setIsSnowflakeSyncing(true);
        setShowSnowflakeModal(false);

        // Convert JSON array back to a CSV Blob to reuse our pipeline seamlessly
        const allHeaders = Object.keys(previewData[0]);

        // The mapping user approved. Drop all other Snowflake columns.
        // These match the resolved aliases from the SQL JOIN query.
        const allowedSnowflakeColumns = new Set([
            'WAVENO', 'AIJOBTYPEDESCRIPTION',
            'TaskTypeName', 'FROMTASKUOMQUANTITY',
            'UserEmail',
            'ACTUALSTARTDATETIME', 'ACTUALFINISHDATETIME',
            // Resolved display names from JOINs
            'AccountName', 'ClientName', 'WarehouseJobTypeName',
            'WarehouseJobCode', 'WarehouseName', 'LocationCode', 'OrderCode'
        ]);

        const headers = allHeaders.filter(h => allowedSnowflakeColumns.has(h));

        const headerRow = headers.join(',');
        const bodyRows = previewData.map((r: any) => {
            return headers.map(h => {
                let val = r[h] ?? '';
                if (val && typeof val === 'object') {
                    // Flatten objects (like Date wrappers) if Snowflake returned them as objects
                    val = val.value || JSON.stringify(val);
                } else {
                    val = String(val);
                }
                // Escape quotes
                if (val.includes('"')) {
                    val = val.replace(/"/g, '""');
                }
                if (val.includes(',') || val.includes('\n') || val.includes('"')) {
                    val = `"${val}"`;
                }
                return val;
            }).join(',');
        }).join('\n');

        const csvContent = headerRow + '\n' + bodyRows;

        const file = new File([csvContent], `WarehouseTask_Sync_${new Date().getTime()}.csv`, { type: 'text/csv' });
        onFilesSelected([file]);

        setIsSnowflakeSyncing(false);
        setPreviewData(null); // Reset
    };

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center",
                    isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
                    isProcessing && "opacity-50 pointer-events-none"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleChange}
                />

                <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                        <Upload className={cn("w-6 h-6", isDragActive ? "text-blue-500" : "text-slate-400")} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-500">
                            Excel (.xlsx, .xls) or CSV files
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-900 text-slate-400">or</span>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <button
                    onClick={handleOpenModal}
                    disabled={isProcessing || isSnowflakeSyncing || showSnowflakeModal}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all border border-white/10",
                        isSnowflakeSyncing ? "bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-[#1f2937] hover:bg-[#374151] text-sky-400 hover:text-sky-300 hover:shadow-sky-500/20"
                    )}
                >
                    {isSnowflakeSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    {isSnowflakeSyncing ? "Connecting..." : "Connect to Snowflake"}
                </button>
            </div>

            {showSnowflakeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={cn(
                        "bg-[#111418] border border-slate-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 max-h-[90vh]",
                        (previewData || schemaObjects) ? "w-[90vw] max-w-7xl h-[85vh]" : "w-full max-w-5xl"
                    )}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Database className="w-5 h-5 text-sky-400" />
                                Snowflake Live Sync: <span className="text-slate-300 font-medium">WarehouseTask</span>
                            </h3>
                            <button onClick={() => setShowSnowflakeModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Filter Section */}
                            <div className="p-6 bg-slate-900/20 border-b border-slate-800 shrink-0">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-sm">
                                    <div className="space-y-1.5">
                                        <label className="text-slate-400 ml-1">Account</label>
                                        <div className="relative">
                                            <select
                                                value={accountId}
                                                onChange={handleAccountChange}
                                                disabled={isLoadingAccounts}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none"
                                            >
                                                <option value="" className="text-slate-500">Select Account</option>
                                                {availableAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                {isLoadingAccounts ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-slate-400 ml-1">Warehouse (Optional)</label>
                                        <div className="relative">
                                            <select
                                                value={warehouse}
                                                onChange={(e) => setWarehouse(e.target.value)}
                                                disabled={!accountId || isLoadingWarehouses}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none uppercase disabled:opacity-50"
                                            >
                                                <option value="" className="text-slate-500">All Warehouses</option>
                                                {availableWarehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.code}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                {isLoadingWarehouses ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-slate-400 ml-1">Begin Date</label>
                                        <input
                                            type="datetime-local"
                                            value={beginDate}
                                            onChange={e => setBeginDate(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 transition-all font-sans"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-slate-400 ml-1">End Date</label>
                                        <input
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 transition-all font-sans"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    {snowflakeError ? (
                                        <div className="flex items-center gap-2 text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded border border-rose-900/50 text-sm">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span className="truncate max-w-md">{snowflakeError}</span>
                                        </div>
                                    ) : <div />}

                                    <div className="flex gap-2 ml-auto items-center">
                                        <label className="flex items-center gap-2 text-sm text-slate-300 mr-2 cursor-pointer hover:text-white transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isTestMode}
                                                onChange={e => setIsTestMode(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-950"
                                            />
                                            Test Mode
                                        </label>
                                        <button
                                            onClick={fetchSchemaObjects}
                                            disabled={isFetchingObjects || isSnowflakeSyncing}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isFetchingObjects ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                            {isFetchingObjects ? "Loading..." : "Explore Objects"}
                                        </button>
                                        {isSnowflakeSyncing && (
                                            <button
                                                onClick={handleCancelSync}
                                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-600"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            onClick={fetchWarehouseData}
                                            disabled={isSnowflakeSyncing || (!beginDate && !endDate && !warehouse) || !accountId}
                                            className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSnowflakeSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                                            {isSnowflakeSyncing ? "Scanning..." : "Search & Preview"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Data Review Grid */}
                            {previewData && (
                                <div className="flex-1 overflow-hidden flex flex-col bg-[#0b0c0f]">
                                    <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                                            <Table className="w-4 h-4 text-emerald-400" />
                                            {previewData.length.toLocaleString()} rows found
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                        <div className="inline-block min-w-full align-middle">
                                            <table className="min-w-full divide-y divide-slate-800 font-mono text-[11px] lg:text-xs">
                                                <thead className="sticky top-0 bg-[#0b0c0f] z-10 shadow-sm border-b border-slate-800">
                                                    <tr>
                                                        {Object.keys(previewData[0]).map((key) => (
                                                            <th key={key} scope="col" className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap bg-slate-900/60 font-sans tracking-wide">
                                                                {key}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50 bg-[#111418]">
                                                    {previewData.slice(0, 100).map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                                            {Object.values(row).map((val: any, colIdx) => {
                                                                let displayVal = val;
                                                                if (val && typeof val === 'object') {
                                                                    // Handle Snowflake date objects explicitly
                                                                    displayVal = val.value || JSON.stringify(val);
                                                                }
                                                                return (
                                                                    <td key={colIdx} className="px-3 py-2 whitespace-nowrap text-slate-300 border-r border-slate-800/30 last:border-r-0">
                                                                        {String(displayVal)}
                                                                    </td>
                                                                )
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {previewData.length > 100 && (
                                            <div className="py-4 text-center text-slate-500 text-sm font-mono border-t border-slate-800">
                                                ... showing first 100 of {previewData.length.toLocaleString()} rows ...
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar */}
                                    <div className="p-4 border-t border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between">
                                        <p className="text-xs text-slate-400 font-medium">Please verify the headers and rows align with standard ingestion before confirming.</p>
                                        <button
                                            onClick={handleApproveAndImport}
                                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white transition-all bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                                        >
                                            <Check className="w-5 h-5" />
                                            Approve & Import {previewData.length.toLocaleString()} Rows
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!previewData && !isSnowflakeSyncing && !schemaObjects && (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 space-y-4 shrink-0">
                                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                        <Filter className="w-8 h-8 text-sky-500/50" />
                                    </div>
                                    <p className="text-center font-medium">Populate filters above to preview and pull <span className="text-slate-300">WarehouseTask</span> data.</p>
                                </div>
                            )}
                            {/* Schema Objects Review Grid */}
                            {schemaObjects && (
                                <div className="flex-1 overflow-hidden flex flex-col bg-[#0b0c0f]">
                                    <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                                            <Database className="w-4 h-4 text-sky-400" />
                                            {schemaObjects.length.toLocaleString()} Schema Objects Found
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                        <div className="inline-block min-w-full align-middle">
                                            <table className="min-w-full divide-y divide-slate-800 font-mono text-[11px] lg:text-xs">
                                                <thead className="sticky top-0 bg-[#0b0c0f] z-10 shadow-sm border-b border-slate-800">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap bg-slate-900/60 font-sans tracking-wide">Name</th>
                                                        <th className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap bg-slate-900/60 font-sans tracking-wide">Type</th>
                                                        <th className="px-3 py-2 text-right font-semibold text-slate-400 whitespace-nowrap bg-slate-900/60 font-sans tracking-wide">Rows</th>
                                                        <th className="px-3 py-2 text-right font-semibold text-slate-400 whitespace-nowrap bg-slate-900/60 font-sans tracking-wide">Size (Bytes)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50 bg-[#111418]">
                                                    {schemaObjects.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                                            <td className="px-3 py-2.5 text-sky-400 truncate max-w-sm">{row.Name}</td>
                                                            <td className="px-3 py-2.5 text-slate-300">
                                                                <span className={cn("px-2 py-0.5 rounded text-[10px]", row.Type === 'VIEW' ? "bg-purple-500/10 text-purple-400" : "bg-emerald-500/10 text-emerald-400")}>
                                                                    {row.Type}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-400 text-right">{row.Rows?.toLocaleString() || '-'}</td>
                                                            <td className="px-3 py-2.5 text-slate-400 text-right">{row.Bytes?.toLocaleString() || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
