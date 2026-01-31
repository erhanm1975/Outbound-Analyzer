import { useMemo, useState } from 'react';
import { type ShiftRecord } from '../types';
import { ArrowLeft, Table, CheckSquare, Zap, Clock, TrendingUp } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface MetricSupportViewProps {
    data: ShiftRecord[];
    metric: string;
    onBack: () => void;
}

export function MetricSupportView({ data, metric, onBack }: MetricSupportViewProps) {

    // State for view controls
    const [pickingUnitsViewMode, setPickingUnitsViewMode] = useState<'date' | 'user'>('date');
    const [pickingUnitsDateFilter, setPickingUnitsDateFilter] = useState<string | null>(null);
    const [pickingTimeViewMode, setPickingTimeViewMode] = useState<'date' | 'user'>('date');
    const [pickingTimeDateFilter, setPickingTimeDateFilter] = useState<string | null>(null);
    const [pickingSpanViewMode, setPickingSpanViewMode] = useState<'date' | 'user'>('date');
    const [pickingSpanDateFilter, setPickingSpanDateFilter] = useState<string | null>(null);
    const [packingUnitsViewMode, setPackingUnitsViewMode] = useState<'date' | 'user'>('date');
    const [packingUnitsDateFilter, setPackingUnitsDateFilter] = useState<string | null>(null);
    const [packingTimeViewMode, setPackingTimeViewMode] = useState<'date' | 'user'>('date');
    const [packingTimeDateFilter, setPackingTimeDateFilter] = useState<string | null>(null);
    const [packingSpanViewMode, setPackingSpanViewMode] = useState<'date' | 'user'>('date');
    const [packingSpanDateFilter, setPackingSpanDateFilter] = useState<string | null>(null);
    const [pickingUtilizationViewMode, setPickingUtilizationViewMode] = useState<'date' | 'user'>('date');
    const [pickingUtilizationDateFilter, setPickingUtilizationDateFilter] = useState<string | null>(null);
    const [packingUtilizationViewMode, setPackingUtilizationViewMode] = useState<'date' | 'user'>('date');
    const [packingUtilizationDateFilter, setPackingUtilizationDateFilter] = useState<string | null>(null);

    // Helper: Matrix Generator
    const generateMatrix = (subset: ShiftRecord[], valueExtractor: (d: ShiftRecord) => number) => {
        // B. Grouping
        const datesMap = new Map<string, Map<string, number>>(); // DateStr -> (HourStr -> Value)
        const allHours = new Set<string>();

        subset.forEach(d => {
            const finish = new Date(d.Finish);
            const dateStr = format(finish, 'yyyy-MM-dd');
            const hourStr = format(finish, 'HH:00');

            allHours.add(hourStr);

            if (!datesMap.has(dateStr)) {
                datesMap.set(dateStr, new Map());
            }
            const hoursMap = datesMap.get(dateStr)!;
            const current = hoursMap.get(hourStr) || 0;
            hoursMap.set(hourStr, current + valueExtractor(d));
        });

        // C. Sort Columns (Hours)
        const roundedHours = Array.from(allHours).sort();

        // D. Sort Rows (Dates)
        const sortedDates = Array.from(datesMap.keys()).sort();

        // E. Build Rows
        const rows = sortedDates.map(date => {
            const hourMap = datesMap.get(date)!;
            const rowTotal = Array.from(hourMap.values()).reduce((a, b) => a + b, 0);
            return {
                date,
                values: roundedHours.map(h => hourMap.get(h) || 0),
                total: rowTotal,
                average: roundedHours.length > 0 ? (rowTotal / roundedHours.length) : 0
            };
        });

        // F. Build Totals Row (Column Averages/Sums)
        const columnTotals = roundedHours.map(h => {
            let sum = 0;
            rows.forEach(r => {
                const idx = roundedHours.indexOf(h);
                sum += r.values[idx];
            });
            return sum;
        });

        const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
        const totalRowAverage = roundedHours.length > 0 ? (columnTotals.reduce((a, b) => a + b, 0) / roundedHours.length) : 0;

        return {
            columns: roundedHours,
            rows,
            columnTotals,
            totalRowAverage
        };
    };

    // Helper: Span Matrix Generator (Occupancy Denominator)
    const generateSpanMatrix = (subset: ShiftRecord[]) => {
        const datesMap = new Map<string, Map<string, number>>();
        const allHours = new Set<string>();

        // Safety: Return empty matrix if no data
        if (!subset || subset.length === 0) {
            return { columns: [], rows: [], columnTotals: [], totalRowAverage: 0 };
        }

        // 1. Group by Date to find Min/Max
        const dayGroups = new Map<string, ShiftRecord[]>();
        subset.forEach(d => {
            const dateStr = format(new Date(d.Finish), 'yyyy-MM-dd');
            if (!dayGroups.has(dateStr)) dayGroups.set(dateStr, []);
            dayGroups.get(dateStr)!.push(d);
        });

        // 2. Fill Hours between Min Start and Max Finish
        dayGroups.forEach((records, dateStr) => {
            if (!datesMap.has(dateStr)) datesMap.set(dateStr, new Map());
            const hoursMap = datesMap.get(dateStr)!;

            // Find Min Start and Max Finish for this Day
            const starts = records.map(r => new Date(r.Start).getTime());
            const finishes = records.map(r => new Date(r.Finish).getTime());
            let minStart = new Date(Math.min(...starts));
            const maxFinish = new Date(Math.max(...finishes));

            // Safety: Clamp minStart to max 24 hours before maxFinish to prevent infinite loops/memory crash on bad data
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            if (maxFinish.getTime() - minStart.getTime() > ONE_DAY_MS) {
                console.warn(`[MetricSupportView] Found task with >24h duration. Clamping start time for occupancy matrix.`, {
                    originalStart: minStart.toISOString(),
                    finish: maxFinish.toISOString()
                });
                minStart = new Date(maxFinish.getTime() - ONE_DAY_MS);
            }

            let current = new Date(minStart);
            // Round down to start of hour for iteration
            current.setMinutes(0, 0, 0);

            // Safety: Cap iterations to prevent browser hang
            let iterations = 0;
            const MAX_ITERATIONS = 50;

            while (current < maxFinish && iterations < MAX_ITERATIONS) {
                iterations++;
                const hourStr = format(current, 'HH:00');
                allHours.add(hourStr);

                // Calculate overlap of this hour bucket [current, current+1hr] with [minStart, maxFinish]
                const bucketStart = new Date(current);
                const bucketEnd = new Date(current);
                bucketEnd.setHours(bucketEnd.getHours() + 1);

                const overlapStart = bucketStart < minStart ? minStart : bucketStart;
                const overlapEnd = bucketEnd > maxFinish ? maxFinish : bucketEnd;

                if (overlapStart < overlapEnd) {
                    const durationMins = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
                    hoursMap.set(hourStr, durationMins);
                }

                // Next hour
                current.setHours(current.getHours() + 1);
            }
        });

        // Reuse standard matrix generation for rows/columns/totals
        // We reconstruct the internal map structure used by generateMatrix's logic manually here
        // Or simply adapt existing logic. To save code, let's just use the map we built.

        const roundedHours = Array.from(allHours).sort();
        const sortedDates = Array.from(datesMap.keys()).sort();

        const rows = sortedDates.map(date => {
            const hourMap = datesMap.get(date)!;
            const rowTotal = Array.from(hourMap.values()).reduce((a, b) => a + b, 0);
            return {
                date,
                values: roundedHours.map(h => hourMap.get(h) || 0),
                total: rowTotal,
                average: roundedHours.length > 0 ? (rowTotal / roundedHours.length) : 0
            };
        });

        const columnTotals = roundedHours.map(h => {
            let sum = 0;
            rows.forEach(r => {
                const idx = roundedHours.indexOf(h);
                sum += r.values[idx];
            });
            return sum;
        });

        const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
        const totalRowAverage = roundedHours.length > 0 ? (columnTotals.reduce((a, b) => a + b, 0) / roundedHours.length) : 0;

        return { columns: roundedHours, rows, columnTotals, totalRowAverage };
    };

    // Helper: User Matrix Generator (User-based View)
    const generateUserMatrix = (subset: ShiftRecord[], valueExtractor: (d: ShiftRecord) => number, dateFilter: string | null = null) => {
        // Safety: Return empty matrix if no data
        if (!subset || subset.length === 0) {
            return { columns: [], rows: [], columnTotals: [], totalRowAverage: 0 };
        }

        // Filter by date if specified
        const filteredData = dateFilter
            ? subset.filter(d => format(new Date(d.Finish), 'yyyy-MM-dd') === dateFilter)
            : subset;

        if (filteredData.length === 0) {
            return { columns: [], rows: [], columnTotals: [], totalRowAverage: 0 };
        }

        // Group by User -> Hour
        const usersMap = new Map<string, Map<string, number>>(); // User -> (HourStr -> Value)
        const allHours = new Set<string>();

        filteredData.forEach(d => {
            const finish = new Date(d.Finish);
            const hourStr = format(finish, 'HH:00');
            const user = d.User;

            allHours.add(hourStr);

            if (!usersMap.has(user)) {
                usersMap.set(user, new Map());
            }
            const hoursMap = usersMap.get(user)!;
            const current = hoursMap.get(hourStr) || 0;
            hoursMap.set(hourStr, current + valueExtractor(d));
        });

        // Sort columns (hours) and rows (users)
        const roundedHours = Array.from(allHours).sort();
        const sortedUsers = Array.from(usersMap.keys()).sort();

        // Build rows
        const rows = sortedUsers.map(user => {
            const hourMap = usersMap.get(user)!;
            const rowTotal = Array.from(hourMap.values()).reduce((a, b) => a + b, 0);
            return {
                date: user, // Using 'date' field to store user name for compatibility with MatrixTable
                values: roundedHours.map(h => hourMap.get(h) || 0),
                total: rowTotal,
                average: roundedHours.length > 0 ? (rowTotal / roundedHours.length) : 0
            };
        });

        // Column totals
        const columnTotals = roundedHours.map(h => {
            let sum = 0;
            rows.forEach(r => {
                const idx = roundedHours.indexOf(h);
                sum += r.values[idx];
            });
            return sum;
        });

        const totalRowAverage = roundedHours.length > 0 ? (columnTotals.reduce((a, b) => a + b, 0) / roundedHours.length) : 0;

        return {
            columns: roundedHours,
            rows,
            columnTotals,
            totalRowAverage
        };
    };

    // Helper: Rate Matrix Generator
    const generateRateMatrix = (numMatrix: ReturnType<typeof generateMatrix>, denMatrix: ReturnType<typeof generateMatrix>, scaleFactor = 1) => {
        const columns = numMatrix.columns;

        // Optimize lookups
        const denDateMap = new Map(denMatrix.rows.map(r => [r.date, r]));

        const rows = numMatrix.rows.map(r => {
            const denRow = denDateMap.get(r.date);

            const values = r.values.map((numVal, colIdx) => {
                const colName = columns[colIdx];
                // Find matching column index in denominator matrix
                const denColIdx = denMatrix.columns.indexOf(colName);
                const denVal = (denRow && denColIdx !== -1) ? denRow.values[denColIdx] : 0;

                return denVal > 0 ? (numVal / denVal) * scaleFactor : 0;
            });

            // Row Total: Num Total / Den Total (Assumes Den Total is sum of relevant columns/time)
            // For Efficiency: Total Units / Total Active Minutes
            // For Occupancy: Total Units / Total Shift Span
            const denTotal = denRow?.total || 0;
            const rowTotal = denTotal > 0 ? (r.total / denTotal) * scaleFactor : 0;

            return {
                date: r.date,
                values,
                total: rowTotal,
                average: rowTotal
            };
        });

        // Column Totals
        const columnTotals = numMatrix.columnTotals.map((numTot, colIdx) => {
            const colName = columns[colIdx];
            const denColIdx = denMatrix.columns.indexOf(colName);
            const denTot = denColIdx !== -1 ? denMatrix.columnTotals[denColIdx] : 0;

            return denTot > 0 ? (numTot / denTot) * scaleFactor : 0;
        });

        const numGrand = numMatrix.rows.reduce((sum, r) => sum + r.total, 0);
        const denGrand = denMatrix.rows.reduce((sum, r) => sum + r.total, 0);
        const totalRowAverage = denGrand > 0 ? (numGrand / denGrand) * scaleFactor : 0;

        return { columns, rows, columnTotals, totalRowAverage };
    };

    const {
        pickingUnits, pickingTasks, pickingTime, pickingEfficiency, pickingSpan, pickingOccupancyEff, pickingUtilization,
        packingUnits, packingTasks, packingTime, packingEfficiency, packingSpan, packingOccupancyEff, packingUtilization
    } = useMemo(() => {
        // A. Filter Scopes
        const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
        const packingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));

        const pUnits = generateMatrix(pickingData, d => d.Quantity);
        const pkUnits = generateMatrix(packingData, d => d.Quantity);

        // Tasks
        const pTasks = generateMatrix(pickingData, d => 1);
        const pkTasks = generateMatrix(packingData, d => 1);

        // Time Matrix (Sum of Minutes - PURE ACTIVE)
        const pTime = generateMatrix(pickingData, d => Math.max(0, differenceInMinutes(d.Finish, d.Start)));
        const pkTime = generateMatrix(packingData, d => Math.max(0, differenceInMinutes(d.Finish, d.Start)));

        // Span Matrix (Occupancy Denominator)
        const pSpan = generateSpanMatrix(pickingData);
        const pkSpan = generateSpanMatrix(packingData);

        // Efficiency (Pure Active) = (Units / Active Minutes) * 60
        const pEff = generateRateMatrix(pUnits, pTime, 60);
        const pkEff = generateRateMatrix(pkUnits, pkTime, 60);

        // Efficiency (Occupancy) = (Units / Shift Span Minutes) * 60
        const pOccEff = generateRateMatrix(pUnits, pSpan, 60);
        const pkOccEff = generateRateMatrix(pkUnits, pkSpan, 60);

        // Utilization = (Active Time / Shift Span) * 100
        const pUtil = generateRateMatrix(pTime, pSpan, 100);
        const pkUtil = generateRateMatrix(pkTime, pkSpan, 100);

        return {
            pickingUnits: pUnits, pickingTasks: pTasks,
            pickingTime: pTime, pickingEfficiency: pEff,
            pickingSpan: pSpan, pickingOccupancyEff: pOccEff,
            pickingUtilization: pUtil,

            packingUnits: pkUnits, packingTasks: pkTasks,
            packingTime: pkTime, packingEfficiency: pkEff,
            packingSpan: pkSpan, packingOccupancyEff: pkOccEff,
            packingUtilization: pkUtil
        };
    }, [data, metric]);

    // Compute available dates for filtering
    const availableDates = useMemo(() => {
        const dates = new Set<string>();
        data.forEach(d => dates.add(format(new Date(d.Finish), 'yyyy-MM-dd')));
        return Array.from(dates).sort();
    }, [data]);

    // Generate user-based matrices
    const pickingUnitsUserView = useMemo(() => {
        const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
        return generateUserMatrix(pickingData, d => d.Quantity, pickingUnitsDateFilter);
    }, [data, pickingUnitsDateFilter]);

    const pickingTasksUserView = useMemo(() => {
        const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
        return generateUserMatrix(pickingData, d => 1, pickingUnitsDateFilter);
    }, [data, pickingUnitsDateFilter]);

    const pickingTimeUserView = useMemo(() => {
        const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
        return generateUserMatrix(pickingData, d => Math.max(0, differenceInMinutes(d.Finish, d.Start)), pickingTimeDateFilter);
    }, [data, pickingTimeDateFilter]);

    const pickingEfficiencyUserView = useMemo(() => {
        const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
        const numMatrix = pickingTimeViewMode === 'date' ? pickingUnits : pickingUnitsUserView;
        const denMatrix = pickingTimeViewMode === 'date' ? pickingTime : pickingTimeUserView;
        return generateRateMatrix(numMatrix, denMatrix, 60);
    }, [data, pickingTimeViewMode, pickingTimeDateFilter, pickingUnits, pickingUnitsUserView, pickingTime, pickingTimeUserView]);

    const pickingSpanUserView = useMemo(() => {
        const pickingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('picking'));
        return generateUserMatrix(pickingData, d => {
            const start = new Date(d.Start);
            const finish = new Date(d.Finish);
            return Math.max(0, differenceInMinutes(finish, start));
        }, pickingSpanDateFilter);
    }, [data, pickingSpanDateFilter]);

    const pickingOccupancyUserView = useMemo(() => {
        const numMatrix = pickingSpanViewMode === 'date' ? pickingUnits : pickingUnitsUserView;
        const denMatrix = pickingSpanViewMode === 'date' ? pickingSpan : pickingSpanUserView;
        return generateRateMatrix(numMatrix, denMatrix, 60);
    }, [data, pickingSpanViewMode, pickingSpanDateFilter, pickingUnits, pickingUnitsUserView, pickingSpan, pickingSpanUserView]);

    // Packing user matrices
    const packingUnitsUserView = useMemo(() => {
        const packingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));
        return generateUserMatrix(packingData, d => d.Quantity, packingUnitsDateFilter);
    }, [data, packingUnitsDateFilter]);

    const packingTasksUserView = useMemo(() => {
        const packingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));
        return generateUserMatrix(packingData, d => 1, packingUnitsDateFilter);
    }, [data, packingUnitsDateFilter]);

    const packingTimeUserView = useMemo(() => {
        const packingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));
        return generateUserMatrix(packingData, d => Math.max(0, differenceInMinutes(d.Finish, d.Start)), packingTimeDateFilter);
    }, [data, packingTimeDateFilter]);

    const packingEfficiencyUserView = useMemo(() => {
        const numMatrix = packingTimeViewMode === 'date' ? packingUnits : packingUnitsUserView;
        const denMatrix = packingTimeViewMode === 'date' ? packingTime : packingTimeUserView;
        return generateRateMatrix(numMatrix, denMatrix, 60);
    }, [data, packingTimeViewMode, packingTimeDateFilter, packingUnits, packingUnitsUserView, packingTime, packingTimeUserView]);

    const packingSpanUserView = useMemo(() => {
        const packingData = data.filter(d => (d.TaskType || '').toLowerCase().includes('packing'));
        return generateUserMatrix(packingData, d => {
            const start = new Date(d.Start);
            const finish = new Date(d.Finish);
            return Math.max(0, differenceInMinutes(finish, start));
        }, packingSpanDateFilter);
    }, [data, packingSpanDateFilter]);

    const packingOccupancyUserView = useMemo(() => {
        const numMatrix = packingSpanViewMode === 'date' ? packingUnits : packingUnitsUserView;
        const denMatrix = packingSpanViewMode === 'date' ? packingSpan : packingSpanUserView;
        return generateRateMatrix(numMatrix, denMatrix, 60);
    }, [data, packingSpanViewMode, packingSpanDateFilter, packingUnits, packingUnitsUserView, packingSpan, packingSpanUserView]);

    // Utilization user matrices (reuse existing Time and Span user views)
    const pickingUtilizationUserView = useMemo(() => {
        const numMatrix = pickingUtilizationViewMode === 'date' ? pickingTime : pickingTimeUserView;
        const denMatrix = pickingUtilizationViewMode === 'date' ? pickingSpan : pickingSpanUserView;
        return generateRateMatrix(numMatrix, denMatrix, 100);
    }, [pickingUtilizationViewMode, pickingUtilizationDateFilter, pickingTime, pickingTimeUserView, pickingSpan, pickingSpanUserView]);

    const packingUtilizationUserView = useMemo(() => {
        const numMatrix = packingUtilizationViewMode === 'date' ? packingTime : packingTimeUserView;
        const denMatrix = packingUtilizationViewMode === 'date' ? packingSpan : packingSpanUserView;
        return generateRateMatrix(numMatrix, denMatrix, 100);
    }, [packingUtilizationViewMode, packingUtilizationDateFilter, packingTime, packingTimeUserView, packingSpan, packingSpanUserView]);

    const isUphMetric = metric.includes('UPH');
    const isUtilizationMetric = metric.includes('Utilization');

    // Reusable Table Component with View Controls
    const MatrixTable = ({
        title,
        tableData,
        icon: Icon,
        isTasks = false,
        isTime = false,
        isRate = false,
        logicDescription,
        colorClass = "text-blue-500",
        enableViewToggle = false,
        viewMode = 'date',
        onViewModeChange,
        availableDates = [],
        selectedDate = null,
        onDateChange,
        rowLabel = 'Date'
    }: {
        title: string,
        tableData: ReturnType<typeof generateMatrix>,
        icon: any,
        isTasks?: boolean,
        isTime?: boolean,
        isRate?: boolean,
        logicDescription: string[],
        colorClass?: string,
        enableViewToggle?: boolean,
        viewMode?: 'date' | 'user',
        onViewModeChange?: (mode: 'date' | 'user') => void,
        availableDates?: string[],
        selectedDate?: string | null,
        onDateChange?: (date: string | null) => void,
        rowLabel?: string
    }) => (
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-sm overflow-hidden p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-slate-700">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <h3 className="font-bold text-lg">{title}</h3>
                </div>

                {enableViewToggle && onViewModeChange && (
                    <div className="flex items-center gap-4">
                        {/* Radio Button View Toggle */}
                        <div className="flex items-center gap-3 bg-slate-50/80 rounded-lg p-1.5 border border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="viewMode"
                                    value="date"
                                    checked={viewMode === 'date'}
                                    onChange={() => onViewModeChange('date')}
                                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">By Date</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="viewMode"
                                    value="user"
                                    checked={viewMode === 'user'}
                                    onChange={() => onViewModeChange('user')}
                                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">By User</span>
                            </label>
                        </div>

                        {/* Date Dropdown (visible only in user view) */}
                        {viewMode === 'user' && onDateChange && (
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedDate || ''}
                                    onChange={(e) => onDateChange(e.target.value || null)}
                                    className="px-3 py-1.5 text-sm bg-white/80 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                                >
                                    <option value="">All Dates</option>
                                    {availableDates.map(date => (
                                        <option key={date} value={date}>{date}</option>
                                    ))}
                                </select>
                                {selectedDate && (
                                    <button
                                        onClick={() => onDateChange(null)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Clear filter"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 font-semibold text-slate-500 bg-slate-50/50">{rowLabel}</th>
                            {tableData.columns.map(col => (
                                <th key={col} className="px-4 py-3 font-semibold text-slate-600 bg-slate-50/50 text-right tabular-nums">
                                    {col}
                                </th>
                            ))}
                            <th className="px-4 py-3 font-bold text-slate-700 bg-slate-100/50 text-right border-l border-slate-200">Total</th>
                            <th className={`px-4 py-3 font-bold text-right border-l border-slate-200 ${colorClass.replace('text-', 'text-').replace('500', '700')} bg-slate-50/50`}>Avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-800 tabular-nums whitespace-nowrap">{row.date}</td>
                                {row.values.map((val, i) => (
                                    <td key={i} className={`px-4 py-3 text-right tabular-nums ${val === 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {val > 0 ? (isTasks ? val.toLocaleString() : val.toLocaleString(undefined, { maximumFractionDigits: isRate ? 0 : 0 })) : '-'}
                                        {val > 0 && isTime && <span className="text-[10px] text-slate-400 ml-0.5">m</span>}
                                    </td>
                                ))}
                                <td className="px-4 py-3 font-bold text-slate-900 text-right bg-slate-50/30 border-l border-slate-200">
                                    {row.total.toLocaleString(undefined, { maximumFractionDigits: isRate ? 0 : 0 })}
                                    {isTime && <span className="text-[10px] text-slate-500 ml-0.5">m</span>}
                                </td>
                                <td className={`px-4 py-3 font-bold text-right border-l border-slate-200 bg-slate-50/30 ${colorClass.replace('text-', 'text-').replace('500', '600')}`}>
                                    {row.average.toFixed(0)}
                                </td>
                            </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-slate-100/50 border-t-2 border-slate-200 font-bold">
                            <td className="px-4 py-3 text-slate-700">{isRate ? 'Weighted Avg' : 'Total'}</td>
                            {tableData.columnTotals.map((tot, i) => (
                                <td key={i} className="px-4 py-3 text-right text-slate-800 tabular-nums">
                                    {tot.toLocaleString(undefined, { maximumFractionDigits: isRate ? 0 : 0 })}
                                    {isTime && <span className="text-[10px] text-slate-500 ml-0.5">m</span>}
                                </td>
                            ))}
                            <td className={`px-4 py-3 text-right border-l border-slate-300 ${colorClass.replace('text-', 'text-').replace('500', '600')}`}>
                                {isRate ? '-' : tableData.rows.reduce((sum, r) => sum + r.total, 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-3 text-right border-l border-slate-300 ${colorClass.replace('text-', 'text-').replace('500', '700')}`}>
                                {tableData.totalRowAverage.toFixed(0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-6 bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Calculation Methodology</h4>
                <ul className="space-y-1">
                    {logicDescription.map((line, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="block w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            {line}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Supportive Data</h2>
                    <p className="text-slate-500 text-sm">Forensic Data Breakdown: {metric}</p>
                </div>
            </div>

            {/* Content: 3x2 Matrix Layout */}
            {isUphMetric ? (
                <div className="space-y-12 pb-12">
                    {/* Picking Process */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 bg-blue-600 rounded-full shadow-sm shadow-blue-200" />
                            <h2 className="text-2xl font-bold text-slate-800">PICKING SUPPORTIVE DATA</h2>
                        </div>

                        {/* Section 1: Throughput */}
                        <section className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-600 border-l-4 border-blue-400 pl-3">UPH Based on Throughput (Hourly Average)</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <MatrixTable
                                    title="Hourly Picking Flow Matrix (Units)"
                                    tableData={pickingUnitsViewMode === 'date' ? pickingUnits : pickingUnitsUserView}
                                    icon={Table}
                                    enableViewToggle={true}
                                    viewMode={pickingUnitsViewMode}
                                    onViewModeChange={setPickingUnitsViewMode}
                                    availableDates={availableDates}
                                    selectedDate={pickingUnitsDateFilter}
                                    onDateChange={setPickingUnitsDateFilter}
                                    rowLabel={pickingUnitsViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        pickingUnitsViewMode === 'date'
                                            ? [
                                                "Scope: Filtered strictly for 'Picking' task types.",
                                                "Aggregation: Sum of 'Quantity' field per hour bucket.",
                                                "Time Basis: Bucketed by Task 'Finish' timestamp."
                                            ]
                                            : [
                                                "Scope: Filtered strictly for 'Picking' task types.",
                                                "Aggregation: Sum of 'Quantity' per user per hour.",
                                                pickingUnitsDateFilter
                                                    ? `Date Filter: ${pickingUnitsDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                                <MatrixTable
                                    title="Hourly Picking Flow Matrix (Tasks)"
                                    tableData={pickingUnitsViewMode === 'date' ? pickingTasks : pickingTasksUserView}
                                    icon={CheckSquare}
                                    isTasks={true}
                                    enableViewToggle={true}
                                    viewMode={pickingUnitsViewMode}
                                    onViewModeChange={setPickingUnitsViewMode}
                                    availableDates={availableDates}
                                    selectedDate={pickingUnitsDateFilter}
                                    onDateChange={setPickingUnitsDateFilter}
                                    rowLabel={pickingUnitsViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        pickingUnitsViewMode === 'date'
                                            ? [
                                                "Scope: Filtered strictly for 'Picking' task types.",
                                                "Aggregation: Count of distinct records (Tasks) per hour bucket."
                                            ]
                                            : [
                                                "Scope: Filtered strictly for 'Picking' task types.",
                                                "Aggregation: Count of tasks per user per hour.",
                                                pickingUnitsDateFilter
                                                    ? `Date Filter: ${pickingUnitsDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                            </div>
                        </section>

                        {/* Section 2: Pure Active */}
                        <section className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-600 border-l-4 border-emerald-400 pl-3">UPH Based on Performance (Pure Active)</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <MatrixTable
                                    title="Hourly Active Picking Time Matrix (Minutes)"
                                    tableData={pickingTimeViewMode === 'date' ? pickingTime : pickingTimeUserView}
                                    icon={Clock}
                                    isTime={true}
                                    colorClass="text-emerald-600"
                                    enableViewToggle={true}
                                    viewMode={pickingTimeViewMode}
                                    onViewModeChange={setPickingTimeViewMode}
                                    availableDates={availableDates}
                                    selectedDate={pickingTimeDateFilter}
                                    onDateChange={setPickingTimeDateFilter}
                                    rowLabel={pickingTimeViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        pickingTimeViewMode === 'date'
                                            ? [
                                                "Metric: Total Direct Active Minutes (Effort) for Picking.",
                                                "Aggregation: Sum of duration (Finish - Start) for all tasks in the bucket.",
                                                "Excludes: Idle time, gaps, and breaks."
                                            ]
                                            : [
                                                "Metric: Total Direct Active Minutes per user.",
                                                "Aggregation: Sum of duration (Finish - Start) for all tasks per user per hour.",
                                                pickingTimeDateFilter
                                                    ? `Date Filter: ${pickingTimeDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                                <MatrixTable
                                    title="Hourly Picking Efficiency Matrix (UPH)"
                                    tableData={pickingTimeViewMode === 'date' ? pickingEfficiency : pickingEfficiencyUserView}
                                    icon={Zap}
                                    isRate={true}
                                    colorClass="text-emerald-600"
                                    enableViewToggle={true}
                                    viewMode={pickingTimeViewMode}
                                    onViewModeChange={setPickingTimeViewMode}
                                    availableDates={availableDates}
                                    selectedDate={pickingTimeDateFilter}
                                    onDateChange={setPickingTimeDateFilter}
                                    rowLabel={pickingTimeViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        pickingTimeViewMode === 'date'
                                            ? [
                                                "Metric: Pure Active UPH (Speed while working) for Picking.",
                                                "Formula: (Total Units / Total Active Minutes) * 60."
                                            ]
                                            : [
                                                "Metric: Pure Active UPH per user.",
                                                "Formula: (User Units / User Active Minutes) * 60.",
                                                pickingTimeDateFilter
                                                    ? `Date Filter: ${pickingTimeDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                            </div>
                        </section>

                        {/* Section 3: Occupancy */}
                        <section className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-600 border-l-4 border-indigo-400 pl-3">UPH Based on Cost (Occupancy)</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <MatrixTable
                                    title="Hourly Picking Shift Span Matrix (Minutes)"
                                    tableData={pickingSpanViewMode === 'date' ? pickingSpan : pickingSpanUserView}
                                    icon={Clock}
                                    isTime={true}
                                    colorClass="text-indigo-600"
                                    enableViewToggle={true}
                                    viewMode={pickingSpanViewMode}
                                    onViewModeChange={setPickingSpanViewMode}
                                    availableDates={availableDates}
                                    selectedDate={pickingSpanDateFilter}
                                    onDateChange={setPickingSpanDateFilter}
                                    rowLabel={pickingSpanViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        pickingSpanViewMode === 'date'
                                            ? [
                                                "Metric: Total Minutes On Floor (Occupancy Cost).",
                                                "Calculation: Continuous duration from First Start to Last Finish within each hour.",
                                                "Includes: All idle time, gaps, and breaks between tasks."
                                            ]
                                            : [
                                                "Metric: Total Minutes On Floor per user.",
                                                "Calculation: Sum of task durations per user per hour.",
                                                pickingSpanDateFilter
                                                    ? `Date Filter: ${pickingSpanDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                                <MatrixTable
                                    title="Hourly Picking Occupancy Matrix (UPH)"
                                    tableData={pickingSpanViewMode === 'date' ? pickingOccupancyEff : pickingOccupancyUserView}
                                    icon={Zap}
                                    isRate={true}
                                    colorClass="text-indigo-600"
                                    enableViewToggle={true}
                                    viewMode={pickingSpanViewMode}
                                    onViewModeChange={setPickingSpanViewMode}
                                    availableDates={availableDates}
                                    selectedDate={pickingSpanDateFilter}
                                    onDateChange={setPickingSpanDateFilter}
                                    rowLabel={pickingSpanViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        pickingSpanViewMode === 'date'
                                            ? [
                                                "Metric: Occupancy UPH (Cost Efficiency).",
                                                "Formula: (Total Units / Shift Span Minutes) * 60.",
                                                "Audit: Should result in lower UPH than Pure Active if there are gaps."
                                            ]
                                            : [
                                                "Metric: Occupancy UPH per user.",
                                                "Formula: (User Units / User Span Minutes) * 60.",
                                                pickingSpanDateFilter
                                                    ? `Date Filter: ${pickingSpanDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                            </div>
                        </section>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-8"></div>

                    {/* Packing Process */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 bg-fuchsia-600 rounded-full shadow-sm shadow-fuchsia-200" />
                            <h2 className="text-2xl font-bold text-slate-800">PACKING SUPPORTIVE DATA</h2>
                        </div>

                        {/* Section 1: Throughput */}
                        <section className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-600 border-l-4 border-fuchsia-400 pl-3">UPH Based on Throughput (Hourly Average)</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <MatrixTable
                                    title="Hourly Packing Flow Matrix (Units)"
                                    tableData={packingUnitsViewMode === 'date' ? packingUnits : packingUnitsUserView}
                                    icon={Table}
                                    colorClass="text-fuchsia-500"
                                    enableViewToggle={true}
                                    viewMode={packingUnitsViewMode}
                                    onViewModeChange={setPackingUnitsViewMode}
                                    availableDates={availableDates}
                                    selectedDate={packingUnitsDateFilter}
                                    onDateChange={setPackingUnitsDateFilter}
                                    rowLabel={packingUnitsViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        packingUnitsViewMode === 'date'
                                            ? [
                                                "Scope: Filtered strictly for 'Packing' task types.",
                                                "Aggregation: Sum of 'Quantity' field per hour bucket.",
                                                "Time Basis: Bucketed by Task 'Finish' timestamp."
                                            ]
                                            : [
                                                "Scope: Filtered strictly for 'Packing' task types.",
                                                "Aggregation: Sum of 'Quantity' per user per hour.",
                                                packingUnitsDateFilter
                                                    ? `Date Filter: ${packingUnitsDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                                <MatrixTable
                                    title="Hourly Packing Flow Matrix (Tasks)"
                                    tableData={packingUnitsViewMode === 'date' ? packingTasks : packingTasksUserView}
                                    icon={CheckSquare}
                                    isTasks={true}
                                    colorClass="text-fuchsia-500"
                                    enableViewToggle={true}
                                    viewMode={packingUnitsViewMode}
                                    onViewModeChange={setPackingUnitsViewMode}
                                    availableDates={availableDates}
                                    selectedDate={packingUnitsDateFilter}
                                    onDateChange={setPackingUnitsDateFilter}
                                    rowLabel={packingUnitsViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        packingUnitsViewMode === 'date'
                                            ? [
                                                "Scope: Filtered strictly for 'Packing' task types.",
                                                "Aggregation: Count of distinct records (Tasks) per hour bucket."
                                            ]
                                            : [
                                                "Scope: Filtered strictly for 'Packing' task types.",
                                                "Aggregation: Count of tasks per user per hour.",
                                                packingUnitsDateFilter
                                                    ? `Date Filter: ${packingUnitsDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                            </div>
                        </section>

                        {/* Section 2: Pure Active */}
                        <section className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-600 border-l-4 border-teal-400 pl-3">UPH Based on Performance (Pure Active)</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <MatrixTable
                                    title="Hourly Active Packing Time Matrix (Minutes)"
                                    tableData={packingTimeViewMode === 'date' ? packingTime : packingTimeUserView}
                                    icon={Clock}
                                    isTime={true}
                                    colorClass="text-teal-600"
                                    enableViewToggle={true}
                                    viewMode={packingTimeViewMode}
                                    onViewModeChange={setPackingTimeViewMode}
                                    availableDates={availableDates}
                                    selectedDate={packingTimeDateFilter}
                                    onDateChange={setPackingTimeDateFilter}
                                    rowLabel={packingTimeViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        packingTimeViewMode === 'date'
                                            ? [
                                                "Metric: Total Direct Active Minutes (Effort) for Packing.",
                                                "Aggregation: Sum of duration (Finish - Start) for all tasks in the bucket.",
                                                "Excludes: Idle time, gaps, and breaks."
                                            ]
                                            : [
                                                "Metric: Total Direct Active Minutes per user.",
                                                "Aggregation: Sum of duration (Finish - Start) for all tasks per user per hour.",
                                                packingTimeDateFilter
                                                    ? `Date Filter: ${packingTimeDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                                <MatrixTable
                                    title="Hourly Packing Efficiency Matrix (UPH)"
                                    tableData={packingTimeViewMode === 'date' ? packingEfficiency : packingEfficiencyUserView}
                                    icon={Zap}
                                    isRate={true}
                                    colorClass="text-teal-600"
                                    enableViewToggle={true}
                                    viewMode={packingTimeViewMode}
                                    onViewModeChange={setPackingTimeViewMode}
                                    availableDates={availableDates}
                                    selectedDate={packingTimeDateFilter}
                                    onDateChange={setPackingTimeDateFilter}
                                    rowLabel={packingTimeViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        packingTimeViewMode === 'date'
                                            ? [
                                                "Metric: Pure Active UPH (Speed while working) for Packing.",
                                                "Formula: (Total Units / Total Active Minutes) * 60."
                                            ]
                                            : [
                                                "Metric: Pure Active UPH per user.",
                                                "Formula: (User Units / User Active Minutes) * 60.",
                                                packingTimeDateFilter
                                                    ? `Date Filter: ${packingTimeDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                            </div>
                        </section>

                        {/* Section 3: Occupancy */}
                        <section className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-600 border-l-4 border-rose-400 pl-3">UPH Based on Cost (Occupancy)</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <MatrixTable
                                    title="Hourly Packing Shift Span Matrix (Minutes)"
                                    tableData={packingSpanViewMode === 'date' ? packingSpan : packingSpanUserView}
                                    icon={Clock}
                                    isTime={true}
                                    colorClass="text-rose-600"
                                    enableViewToggle={true}
                                    viewMode={packingSpanViewMode}
                                    onViewModeChange={setPackingSpanViewMode}
                                    availableDates={availableDates}
                                    selectedDate={packingSpanDateFilter}
                                    onDateChange={setPackingSpanDateFilter}
                                    rowLabel={packingSpanViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        packingSpanViewMode === 'date'
                                            ? [
                                                "Metric: Total Minutes On Floor (Occupancy Cost).",
                                                "Calculation: Continuous duration from First Start to Last Finish within each hour.",
                                                "Includes: All idle time, gaps, and breaks between tasks."
                                            ]
                                            : [
                                                "Metric: Total Minutes On Floor per user.",
                                                "Calculation: Sum of task durations per user per hour.",
                                                packingSpanDateFilter
                                                    ? `Date Filter: ${packingSpanDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                                <MatrixTable
                                    title="Hourly Packing Occupancy Matrix (UPH)"
                                    tableData={packingSpanViewMode === 'date' ? packingOccupancyEff : packingOccupancyUserView}
                                    icon={Zap}
                                    isRate={true}
                                    colorClass="text-rose-600"
                                    enableViewToggle={true}
                                    viewMode={packingSpanViewMode}
                                    onViewModeChange={setPackingSpanViewMode}
                                    availableDates={availableDates}
                                    selectedDate={packingSpanDateFilter}
                                    onDateChange={setPackingSpanDateFilter}
                                    rowLabel={packingSpanViewMode === 'date' ? 'Date' : 'User'}
                                    logicDescription={
                                        packingSpanViewMode === 'date'
                                            ? [
                                                "Metric: Occupancy UPH (Cost Efficiency).",
                                                "Formula: (Total Units / Shift Span Minutes) * 60.",
                                                "Audit: Should result in lower UPH than Pure Active if there are gaps."
                                            ]
                                            : [
                                                "Metric: Occupancy UPH per user.",
                                                "Formula: (User Units / User Span Minutes) * 60.",
                                                packingSpanDateFilter
                                                    ? `Date Filter: ${packingSpanDateFilter}`
                                                    : "Date Filter: All dates (aggregated)"
                                            ]
                                    }
                                />
                            </div>
                        </section>
                    </div>
                </div>
            ) : isUtilizationMetric ? (
                <div className="space-y-12 pb-12">
                    {/* Picking Utilization */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 bg-blue-600 rounded-full shadow-sm shadow-blue-200" />
                            <h2 className="text-2xl font-bold text-slate-800">PICKING UTILIZATION</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <MatrixTable
                                title="Active Time (Minutes)"
                                tableData={pickingUtilizationViewMode === 'date' ? pickingTime : pickingTimeUserView}
                                icon={Clock}
                                isTime={true}
                                colorClass="text-blue-600"
                                enableViewToggle={true}
                                viewMode={pickingUtilizationViewMode}
                                onViewModeChange={setPickingUtilizationViewMode}
                                availableDates={availableDates}
                                selectedDate={pickingUtilizationDateFilter}
                                onDateChange={setPickingUtilizationDateFilter}
                                rowLabel={pickingUtilizationViewMode === 'date' ? 'Date' : 'User'}
                                logicDescription={
                                    pickingUtilizationViewMode === 'date'
                                        ? [
                                            "Numerator: Total Direct Active Minutes.",
                                            "Sum of (Finish - Start) for all picking tasks."
                                        ]
                                        : [
                                            "Numerator: Total Direct Active Minutes per user.",
                                            "Sum of (Finish - Start) per user per hour.",
                                            pickingUtilizationDateFilter
                                                ? `Date Filter: ${pickingUtilizationDateFilter}`
                                                : "Date Filter: All dates (aggregated)"
                                        ]
                                }
                            />
                            <MatrixTable
                                title="Shift Span (Minutes)"
                                tableData={pickingUtilizationViewMode === 'date' ? pickingSpan : pickingSpanUserView}
                                icon={Clock}
                                isTime={true}
                                colorClass="text-indigo-600"
                                enableViewToggle={true}
                                viewMode={pickingUtilizationViewMode}
                                onViewModeChange={setPickingUtilizationViewMode}
                                availableDates={availableDates}
                                selectedDate={pickingUtilizationDateFilter}
                                onDateChange={setPickingUtilizationDateFilter}
                                rowLabel={pickingUtilizationViewMode === 'date' ? 'Date' : 'User'}
                                logicDescription={
                                    pickingUtilizationViewMode === 'date'
                                        ? [
                                            "Denominator: Total Time On Floor.",
                                            "Continuous duration from First Start to Last Finish."
                                        ]
                                        : [
                                            "Denominator: Total Time On Floor per user.",
                                            "Sum of task durations per user per hour.",
                                            pickingUtilizationDateFilter
                                                ? `Date Filter: ${pickingUtilizationDateFilter}`
                                                : "Date Filter: All dates (aggregated)"
                                        ]
                                }
                            />
                            <MatrixTable
                                title="Utilization %"
                                tableData={pickingUtilizationViewMode === 'date' ? pickingUtilization : pickingUtilizationUserView}
                                icon={Zap}
                                isRate={true}
                                colorClass="text-emerald-600"
                                enableViewToggle={true}
                                viewMode={pickingUtilizationViewMode}
                                onViewModeChange={setPickingUtilizationViewMode}
                                availableDates={availableDates}
                                selectedDate={pickingUtilizationDateFilter}
                                onDateChange={setPickingUtilizationDateFilter}
                                rowLabel={pickingUtilizationViewMode === 'date' ? 'Date' : 'User'}
                                logicDescription={
                                    pickingUtilizationViewMode === 'date'
                                        ? [
                                            "Formula: (Active Time / Shift Span) * 100.",
                                            "Measures how much of the shift was spent on direct work tasks."
                                        ]
                                        : [
                                            "Formula: (User Active Time / User Shift Span) * 100.",
                                            "Per-user utilization percentage.",
                                            pickingUtilizationDateFilter
                                                ? `Date Filter: ${pickingUtilizationDateFilter}`
                                                : "Date Filter: All dates (aggregated)"
                                        ]
                                }
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-8"></div>

                    {/* Packing Utilization */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 bg-fuchsia-600 rounded-full shadow-sm shadow-fuchsia-200" />
                            <h2 className="text-2xl font-bold text-slate-800">PACKING UTILIZATION</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <MatrixTable
                                title="Active Time (Minutes)"
                                tableData={packingUtilizationViewMode === 'date' ? packingTime : packingTimeUserView}
                                icon={Clock}
                                isTime={true}
                                colorClass="text-fuchsia-600"
                                enableViewToggle={true}
                                viewMode={packingUtilizationViewMode}
                                onViewModeChange={setPackingUtilizationViewMode}
                                availableDates={availableDates}
                                selectedDate={packingUtilizationDateFilter}
                                onDateChange={setPackingUtilizationDateFilter}
                                rowLabel={packingUtilizationViewMode === 'date' ? 'Date' : 'User'}
                                logicDescription={
                                    packingUtilizationViewMode === 'date'
                                        ? [
                                            "Numerator: Total Direct Active Minutes.",
                                            "Sum of (Finish - Start) for all packing tasks."
                                        ]
                                        : [
                                            "Numerator: Total Direct Active Minutes per user.",
                                            "Sum of (Finish - Start) per user per hour.",
                                            packingUtilizationDateFilter
                                                ? `Date Filter: ${packingUtilizationDateFilter}`
                                                : "Date Filter: All dates (aggregated)"
                                        ]
                                }
                            />
                            <MatrixTable
                                title="Shift Span (Minutes)"
                                tableData={packingUtilizationViewMode === 'date' ? packingSpan : packingSpanUserView}
                                icon={Clock}
                                isTime={true}
                                colorClass="text-rose-600"
                                enableViewToggle={true}
                                viewMode={packingUtilizationViewMode}
                                onViewModeChange={setPackingUtilizationViewMode}
                                availableDates={availableDates}
                                selectedDate={packingUtilizationDateFilter}
                                onDateChange={setPackingUtilizationDateFilter}
                                rowLabel={packingUtilizationViewMode === 'date' ? 'Date' : 'User'}
                                logicDescription={
                                    packingUtilizationViewMode === 'date'
                                        ? [
                                            "Denominator: Total Time On Floor.",
                                            "Continuous duration from First Start to Last Finish."
                                        ]
                                        : [
                                            "Denominator: Total Time On Floor per user.",
                                            "Sum of task durations per user per hour.",
                                            packingUtilizationDateFilter
                                                ? `Date Filter: ${packingUtilizationDateFilter}`
                                                : "Date Filter: All dates (aggregated)"
                                        ]
                                }
                            />
                            <MatrixTable
                                title="Utilization %"
                                tableData={packingUtilizationViewMode === 'date' ? packingUtilization : packingUtilizationUserView}
                                icon={Zap}
                                isRate={true}
                                colorClass="text-teal-600"
                                enableViewToggle={true}
                                viewMode={packingUtilizationViewMode}
                                onViewModeChange={setPackingUtilizationViewMode}
                                availableDates={availableDates}
                                selectedDate={packingUtilizationDateFilter}
                                onDateChange={setPackingUtilizationDateFilter}
                                rowLabel={packingUtilizationViewMode === 'date' ? 'Date' : 'User'}
                                logicDescription={
                                    packingUtilizationViewMode === 'date'
                                        ? [
                                            "Formula: (Active Time / Shift Span) * 100.",
                                            "Measures how much of the shift was spent on direct work tasks."
                                        ]
                                        : [
                                            "Formula: (User Active Time / User Shift Span) * 100.",
                                            "Per-user utilization percentage.",
                                            packingUtilizationDateFilter
                                                ? `Date Filter: ${packingUtilizationDateFilter}`
                                                : "Date Filter: All dates (aggregated)"
                                        ]
                                }
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                    Feature under construction for metric: {metric}
                </div>
            )}
        </div>
    );
}
