
import { SortableVolumeChart } from './SortableVolumeChart';

interface WaveVolumeChartProps {
    data: {
        waveCode: string;
        totalJobs: number;
        avgOrders: number;
        avgUnits: number;
    }[];
}

export function WaveVolumeChart({ data }: WaveVolumeChartProps) {
    // Transform data to ChartRecord format
    const chartData = data.map(d => ({
        id: d.waveCode,
        label: d.waveCode,
        volume: d.totalJobs,
        metric1: d.avgOrders,
        metric2: d.avgUnits
    }));

    return (
        <SortableVolumeChart
            title="Wave Volume"
            subtitle="Wave-based workload distribution"
            data={chartData}
            labels={{
                item: "Wave No",
                volume: "Total Jobs",
                metric1: "Avg Orders",
                metric2: "Avg Units"
            }}
            colorScheme="cyan"
            pageSize={10}
        />
    );
}
