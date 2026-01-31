import { describe, it, expect } from 'vitest';
import { analyzeShift } from './analysis';
import { DEFAULT_CONFIG, type ShiftRecord } from '../types';

describe('analyzeShift', () => {
    const baseRecord: ShiftRecord = {
        Account: 'Test', Client: 'Test', Warehouse: 'W1', WaveCode: 'W1',
        JobCode: 'JOB1', JobType: 'Picking', TaskType: 'Case', SKU: '123',
        AIJobDescription: 'Standard Pick', OrderCode: 'ORD001',
        Quantity: 10, Zone: 'A', Location: 'A1', User: 'User1',
        Start: new Date('2023-01-01T10:00:00Z'),
        Finish: new Date('2023-01-01T10:30:00Z')
    };

    it('calculates intra-job gap correctly', () => {
        const data: ShiftRecord[] = [
            { ...baseRecord },
            {
                ...baseRecord,
                Start: new Date('2023-01-01T10:35:00Z'), // 5 min gap
                Finish: new Date('2023-01-01T11:00:00Z')
            }
        ];

        const result = analyzeShift(data, DEFAULT_CONFIG);
        // Raw Gap: 5 min. Intra Job Buffer: 2 min. Net: 3 min.
        expect(result.records[1].rawGap).toBe(5);
        expect(result.records[1].netGap).toBe(3);
        expect(result.records[1].gapType).toBe('INTRA_JOB');
    });

    it('handles overlap', () => {
        const data: ShiftRecord[] = [
            { ...baseRecord }, // Finish 10:30
            {
                ...baseRecord,
                Start: new Date('2023-01-01T10:25:00Z'), // Start 10:25 (overlap)
                Finish: new Date('2023-01-01T11:00:00Z')
            }
        ];

        const result = analyzeShift(data, DEFAULT_CONFIG);
        expect(result.records[1].gapType).toBe('OVERLAP');
        expect(result.records[1].netGap).toBe(0);
        expect(result.telemetry.length).toBe(1);
    });

    it('calculates Hourly Flow UPH based on Finish Time', () => {
        const data: ShiftRecord[] = [
            // Hour 1: 10:00 - 10:59. Total Units: 100
            { ...baseRecord, Finish: new Date('2023-01-01T10:15:00Z'), Quantity: 40 },
            { ...baseRecord, Finish: new Date('2023-01-01T10:45:00Z'), Quantity: 60 },
            // Hour 2: 11:00 - 11:59. Total Units: 50
            { ...baseRecord, Finish: new Date('2023-01-01T11:10:00Z'), Quantity: 50 },
            // Hour 3 (skip)
            // Hour 4: 13:00 - 13:59. Total Units: 30
            { ...baseRecord, Finish: new Date('2023-01-01T13:20:00Z'), Quantity: 30 }
        ];
        // Expect: (100 + 50 + 30) / 3 hours = 60
        const result = analyzeShift(data, DEFAULT_CONFIG);
        expect(result.stats.uphHourlyFlow).toBe(60);
    });
});
