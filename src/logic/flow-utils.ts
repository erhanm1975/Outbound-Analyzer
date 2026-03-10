import { TIME } from '../config/constants';
import { type ShiftRecord } from '../types';

export type IntervalOption = 15 | 30 | 60;

export interface ExtendedIntervalData {
    intervalStart: Date;
    intervalEnd: Date;
    volume: number;
    taskCount: number;
    activeUserCount: number;
    rate: number;
    users: Record<string, number>;
    userTasks: Record<string, number>;
}

export interface ExtendedFlowData {
    intervals: ExtendedIntervalData[];
    allUsers: string[];
}

export function bucketRecords(records: ShiftRecord[], intervalMin: IntervalOption): ExtendedFlowData {
    if (records.length === 0) return { intervals: [], allUsers: [] };

    let minTime = Infinity;
    let maxTime = -Infinity;
    for (let i = 0; i < records.length; i++) {
        const s = records[i].Start.getTime();
        const f = records[i].Finish.getTime();
        if (s < minTime) minTime = s;
        if (f > maxTime) maxTime = f;
    }

    const bucketSizeMs = intervalMin * TIME.ONE_MINUTE_MS;
    const buckets: Record<number, {
        volume: number;
        taskCount: number;
        users: Set<string>;
        userVols: Record<string, number>;
        userTasks: Record<string, number>;
    }> = {};

    for (let t = minTime - (minTime % bucketSizeMs); t <= maxTime; t += bucketSizeMs) {
        buckets[t] = { volume: 0, taskCount: 0, users: new Set(), userVols: {}, userTasks: {} };
    }

    const distinctUsers = new Set<string>();

    records.forEach(r => {
        distinctUsers.add(r.User);
        const recordTime = r.Finish.getTime();
        const bucketStart = recordTime - (recordTime % bucketSizeMs);

        if (!buckets[bucketStart]) {
            buckets[bucketStart] = { volume: 0, taskCount: 0, users: new Set(), userVols: {}, userTasks: {} };
        }
        buckets[bucketStart].volume += r.Quantity;
        buckets[bucketStart].taskCount += 1;
        buckets[bucketStart].users.add(r.User);

        if (!buckets[bucketStart].userVols[r.User]) buckets[bucketStart].userVols[r.User] = 0;
        buckets[bucketStart].userVols[r.User] += r.Quantity;

        if (!buckets[bucketStart].userTasks[r.User]) buckets[bucketStart].userTasks[r.User] = 0;
        buckets[bucketStart].userTasks[r.User] += 1;
    });

    const sortedTimes = Object.keys(buckets).map(Number).sort((a, b) => a - b);

    const intervals: ExtendedIntervalData[] = sortedTimes.map(t => {
        const b = buckets[t];
        const activeUsers = b.users.size;
        return {
            intervalStart: new Date(t),
            intervalEnd: new Date(t + bucketSizeMs),
            volume: b.volume,
            taskCount: b.taskCount,
            activeUserCount: activeUsers,
            rate: 0,
            users: b.userVols,
            userTasks: b.userTasks,
        };
    });

    return { intervals, allUsers: Array.from(distinctUsers).sort() };
}
