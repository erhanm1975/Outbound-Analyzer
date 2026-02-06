import { describe, it, expect } from 'vitest';
import { processWarehouseLogic } from './warehouse-transform';
import type { ShiftRecord } from '../types';
import { differenceInSeconds } from 'date-fns';

describe('Warehouse Transformation Logic', () => {
    // Helper to create basic records
    const createRecord = (overrides: Partial<ShiftRecord>): ShiftRecord => ({
        User: 'UserA',
        Client: 'ClientX',
        Warehouse: 'WH1',
        WaveCode: 'W1',
        JobCode: 'Job1',
        JobType: 'Regular',
        TaskType: 'Pick',
        SKU: 'SKU1',
        Quantity: 10,
        Zone: 'Z1',
        Location: 'L1',
        Start: new Date('2023-01-01T08:00:00Z'),
        Finish: new Date('2023-01-01T08:00:10Z'),
        ...overrides
    });

    it('should handle empty input', () => {
        const result = processWarehouseLogic([]);
        expect(result.tasks).toHaveLength(0);
        expect(result.activities).toHaveLength(0);
    });

    describe('Phase 1: Task Objects & Batch Normalization', () => {
        it('should normalize batch tasks (same user/time/loc)', () => {
            const start = new Date('2023-01-01T08:00:00Z');
            const finish = new Date('2023-01-01T08:01:00Z'); // 60s duration

            const r1 = createRecord({ Start: start, Finish: finish, SKU: 'SKU1' });
            const r2 = createRecord({ Start: start, Finish: finish, SKU: 'SKU1' }); // Same everything

            const { tasks } = processWarehouseLogic([r1, r2]);

            expect(tasks).toHaveLength(2);
            expect(tasks[0].IsBatchNormalized).toBe(true);
            expect(tasks[0].BatchSize).toBe(2);
            // 60s total / 2 = 30s each
            expect(tasks[0].ProductiveDurationSec).toBe(30);
            expect(tasks[1].ProductiveDurationSec).toBe(30);
        });

        it('should apply 70/30 split for Picking tasks', () => {
            const start = new Date('2023-01-01T08:00:00Z');
            const finish = new Date('2023-01-01T08:01:40Z'); // 100s duration
            const record = createRecord({ TaskType: 'Pick', Start: start, Finish: finish });

            const { tasks } = processWarehouseLogic([record]);

            expect(tasks[0].ProductiveDurationSec).toBe(100);
            expect(tasks[0].TaskDirectTimeSec).toBe(30); // 30%
            expect(tasks[0].TaskTravelTimeSec).toBe(70); // 70%
        });

        it('should classify Break/Delay tasks as Unproductive', () => {
            const start = new Date('2023-01-01T08:00:00Z');
            const finish = new Date('2023-01-01T08:05:00Z'); // 300s
            const record = createRecord({ TaskType: 'Break', Start: start, Finish: finish });

            const { tasks } = processWarehouseLogic([record]);

            expect(tasks[0].ProductiveDurationSec).toBe(0);
            expect(tasks[0].UnproductiveDurationSec).toBe(300);
            expect(tasks[0].TaskDirectTimeSec).toBe(0);
            expect(tasks[0].TaskTravelTimeSec).toBe(0);
        });

        it('should apply 100/0 split for Packing tasks', () => {
            const start = new Date('2023-01-01T08:00:00Z');
            const finish = new Date('2023-01-01T08:01:40Z'); // 100s
            const record = createRecord({ TaskType: 'Pack', Start: start, Finish: finish });

            const { tasks } = processWarehouseLogic([record]);

            expect(tasks[0].TaskDirectTimeSec).toBe(100);
            expect(tasks[0].TaskTravelTimeSec).toBe(0);
        });
    });

    describe('Phase 1.5: Gap Injection (Task Sequences)', () => {
        it('should insert "No Activity" task for short Intra-Job gaps', () => {
            const start = new Date('2023-01-01T08:00:00Z');
            const end1 = new Date('2023-01-01T08:05:00Z');
            const start2 = new Date('2023-01-01T08:06:00Z'); // 1 min gap
            const end2 = new Date('2023-01-01T08:10:00Z');

            const r1 = createRecord({ Start: start, Finish: end1, JobCode: 'J1' });
            const r2 = createRecord({ Start: start2, Finish: end2, JobCode: 'J1' }); // Same Job

            const { tasks } = processWarehouseLogic([r1, r2]);

            // Expect: T1, Gap, T2
            expect(tasks).toHaveLength(3);
            expect(tasks[1].TaskType).toBe('No Activity');
            expect(tasks[1].JobCode).toBe('J1'); // Inherited
            expect(tasks[1].ProductiveDurationSec).toBe(60); // 1 min
        });

        it('should insert "Break" task for Inter-Job gaps (Unassigned)', () => {
            const start = new Date('2023-01-01T08:00:00Z');
            const end1 = new Date('2023-01-01T08:05:00Z');
            const start2 = new Date('2023-01-01T08:15:00Z'); // 10 min gap
            const end2 = new Date('2023-01-01T08:20:00Z');

            const r1 = createRecord({ Start: start, Finish: end1, JobCode: 'J1' });
            const r2 = createRecord({ Start: start2, Finish: end2, JobCode: 'J2' }); // Diff Job

            const { tasks } = processWarehouseLogic([r1, r2]);

            expect(tasks).toHaveLength(3);
            expect(tasks[1].TaskType).toBe('Break');
            expect(tasks[1].JobCode).toBe('Unassigned'); // Inter-job
            expect(tasks[1].UnproductiveDurationSec).toBe(600);
        });
    });

    describe('Phase 2: Activity Objects & Gap Analysis', () => {
        it('should insert "No Activity" for short gaps (< 5m)', () => {
            const t1Start = new Date('2023-01-01T08:00:00Z');
            const t1End = new Date('2023-01-01T08:10:00Z');

            // Gap starts 08:10:00, ends 08:14:00 (4 mins = 240s)
            const t2Start = new Date('2023-01-01T08:14:00Z');
            const t2End = new Date('2023-01-01T08:20:00Z');

            const r1 = createRecord({ Start: t1Start, Finish: t1End, JobCode: 'J1' });
            const r2 = createRecord({ Start: t2Start, Finish: t2End, JobCode: 'J2' });

            const { activities } = processWarehouseLogic([r1, r2]);

            // Expect: Activity(J1) -> Gap(No Activity) -> Activity(J2)
            expect(activities).toHaveLength(3);
        });

        it('should insert "No Activity" Gap before first job if Shift Start < First Job', () => {
            // Shift Start defaults to 08:00 AM
            const start = new Date('2023-01-01T08:15:00Z'); // 15 mins after shift
            const finish = new Date('2023-01-01T08:30:00Z');

            const record = createRecord({ Start: start, Finish: finish });
            const { activities } = processWarehouseLogic([record]);

            // Expect:
            // 1. No Activity (08:00 - 08:15) // < 5m? No, 15m is > 5m, so actually Break?
            // Wait, spec says: "If < 5 min: No Activity... If >= 5 min: Break".
            // 15 mins >= 5 mins -> Break.

            expect(activities.length).toBeGreaterThanOrEqual(2);
            const firstGap = activities[0];
            expect(firstGap.Activity).toBe('Break'); // 15 mins
            expect(firstGap.ProductiveDurationSec).toBe(0);
            expect(firstGap.UnproductiveDurationSec).toBe(900); // 15 mins
        });

        it('should create ONE activity per Job Code (Job-Centric)', () => {
            const start1 = new Date('2023-01-01T09:00:00Z');
            const end1 = new Date('2023-01-01T09:10:00Z');

            // Task 2 starts 2 mins later (internal gap), same job
            const start2 = new Date('2023-01-01T09:12:00Z');
            const end2 = new Date('2023-01-01T09:20:00Z');

            const r1 = createRecord({ Start: start1, Finish: end1, JobCode: 'JOB_A', TaskType: 'Pick' });
            const r2 = createRecord({ Start: start2, Finish: end2, JobCode: 'JOB_A', TaskType: 'Pack' });

            const { activities } = processWarehouseLogic([r1, r2]);

            // Should find the Job Activity (ignoring pre-shift gap for this assertion check)
            const jobActivity = activities.find(a => a.JobCode === 'JOB_A');
            expect(jobActivity).toBeDefined();
            expect(jobActivity!.Start).toEqual(start1);
            expect(jobActivity!.Finish).toEqual(end2); // Full span
            expect(jobActivity!.Activity).toContain('Pick');
            expect(jobActivity!.Activity).toContain('Pack');
            expect(jobActivity!.NofTasks).toBe(2);
        });

        it('should insert gaps strictly betweeen jobs', () => {
            const start1 = new Date('2023-01-01T09:00:00Z');
            const end1 = new Date('2023-01-01T09:10:00Z');

            // 10 min gap
            const start2 = new Date('2023-01-01T09:20:00Z');
            const end2 = new Date('2023-01-01T09:30:00Z');

            const r1 = createRecord({ Start: start1, Finish: end1, JobCode: 'JOB_A' });
            const r2 = createRecord({ Start: start2, Finish: end2, JobCode: 'JOB_B' });

            const { activities } = processWarehouseLogic([r1, r2]);

            // JOB_A -> Break (10m) -> JOB_B
            const gap = activities.find(a => a.Activity === 'Break' && a.Start.getTime() === end1.getTime());
            expect(gap).toBeDefined();
            expect(gap!.Finish).toEqual(start2);
        });

        it('should count unique orders (NofOrders)', () => {
            const start = new Date('2023-01-01T09:00:00Z');
            const mid = new Date('2023-01-01T09:05:00Z');
            const end = new Date('2023-01-01T09:10:00Z');

            // Same Job, different orders
            const r1 = createRecord({ Start: start, Finish: mid, JobCode: 'JOB_X', OrderCode: 'O1' });
            const r2 = createRecord({ Start: mid, Finish: end, JobCode: 'JOB_X', OrderCode: 'O2' });
            const r3 = createRecord({ Start: mid, Finish: end, JobCode: 'JOB_X', OrderCode: 'O1' });

            const { activities } = processWarehouseLogic([r1, r2, r3]);
            const jobAct = activities.find(a => a.JobCode === 'JOB_X');

            expect(jobAct).toBeDefined();
            expect(jobAct!.NofOrders).toBe(2);
            expect(jobAct!.NofTasks).toBe(3);
        });
        it('should separate interleaved jobs of same JobCode into distinct activities', () => {
            const start1 = new Date('2023-01-01T09:00:00Z');
            const end1 = new Date('2023-01-01T09:10:00Z');

            // Job B in middle
            const start2 = new Date('2023-01-01T09:10:00Z');
            const end2 = new Date('2023-01-01T09:20:00Z');

            // Job A resumes
            const start3 = new Date('2023-01-01T09:20:00Z');
            const end3 = new Date('2023-01-01T09:30:00Z');

            const r1 = createRecord({ Start: start1, Finish: end1, JobCode: 'JOB_A' });
            const r2 = createRecord({ Start: start2, Finish: end2, JobCode: 'JOB_B' });
            const r3 = createRecord({ Start: start3, Finish: end3, JobCode: 'JOB_A' });

            const { activities } = processWarehouseLogic([r1, r2, r3]);

            // Expect: Gap, A, B, A
            expect(activities).toHaveLength(4);
            expect(activities[0].Activity).toMatch(/No Activity|Break/);
            expect(activities[1].JobCode).toBe('JOB_A');
            expect(activities[2].JobCode).toBe('JOB_B');
            expect(activities[3].JobCode).toBe('JOB_A');
        });
    });
});
