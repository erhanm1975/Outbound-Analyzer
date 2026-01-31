
import { SortableVolumeChart } from './SortableVolumeChart';

interface JobVolumeChartProps {
    data: {
        jobType: string;
        totalJobs: number;
        avgUnits: number;
        avgOrders: number;
    }[];
    efficiencyScore?: number;
}

export function JobVolumeChart({ data, efficiencyScore }: JobVolumeChartProps) {
    // Transform data to ChartRecord format
    const chartData = data.map(d => ({
        id: d.jobType,
        label: d.jobType,
        volume: d.totalJobs,
        metric1: d.avgOrders,
        metric2: d.avgUnits
    }));

    return (
        <SortableVolumeChart
            title="Job Type Volume"
            subtitle="Processing volume & complexity breakdown"
            data={chartData}
            efficiencyScore={efficiencyScore}
            labels={{
                item: "Job Type",
                volume: "Volume",
                metric1: "Avg Orders",
                metric2: "Avg Units"
            }}
            colorScheme="default"
            pageSize={10}
        />
    );
}
